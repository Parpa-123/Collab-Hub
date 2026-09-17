# CollabHub

CollabHub is a full-stack, Git-inspired software collaboration platform built for repository hosting, version tracking, pull requests, code reviews, issue management, and real-time team collaboration.

The platform replicates core Git mechanisms using a Content-Addressable Storage (CAS) architecture with SHA-256 hashing, directory tree generation, snapshot commits, unified line-by-line diff computation, and two-parent merge commits.

Live Application: https://collab-hub-1.onrender.com  
Primary API Service: https://collab-hub-qu4h.onrender.com  
Walkthrough Video: https://drive.google.com/file/d/164ckK6bGlf8k4LiqAJTWtRQd61a9-M-d/view?usp=sharing

---

## Table of Contents

- Overview
- Architecture and Core Mechanics
  - Content-Addressable Storage (CAS)
  - Directory Tree Generation
  - Binary vs. Text Identification
  - Diff Calculation Engine
  - Branch Merge Engine
  - Real-Time Communication Layer
  - Asynchronous Processing and Event Bus
  - Authentication and Access Control
- Tech Stack
- System Architecture Diagram
- Repository Structure
- Database Schema and Models
- REST API Reference
- WebSocket Protocol Reference
- Local Development Setup
  - Prerequisites
  - Option A: Docker Compose (Recommended)
  - Option B: Manual Local Setup
- Environment Variables
- Testing and Quality Assurance
- Production Deployment and CI/CD

---

## Overview

CollabHub provides development teams with an open-source collaboration environment similar to GitHub or GitLab. Instead of running external Git binaries on the host system, the application implements Git-like version control directly within Python and Django models. It stores content-addressed data blocks, computes branch lineages, generates diffs, handles code reviews with inline comments, and synchronizes issue boards across users using WebSocket connections.

Key capabilities include:
- Repository hosting with public and private visibility settings.
- Role-based permissions supporting Owner, Admin, Maintainer, Member, and Viewer tiers.
- Multi-file directory uploads through the web interface with background processing.
- Interactive file explorer with client-side caching and syntax highlighting for over 50 languages.
- Pull request workflows with draft toggling, conflict detection, code reviews, and merge validation.
- Drag-and-drop Kanban issue tracking with real-time state synchronization via WebSockets.
- Polymorphic comment system supporting threaded conversations and inline code review notes.
- Notification dispatching with unread badges and deduplication algorithms.

---

## Architecture and Core Mechanics

### Content-Addressable Storage (CAS)

CollabHub separates file content from file metadata to ensure zero storage redundancy:

- Blob: Stores immutable raw file content identified by a unique SHA-256 checksum (`content_hash`). If multiple files or multiple commits share the exact same content, they reference the same Blob record.
- Tree: Acts as the root namespace for all directory nodes belonging to a single commit.
- TreeNode: Represents a single filesystem entry inside a Tree. A node has a `name`, full `path`, `type` (`file` or `dir`), and an optional `parent` pointer to another TreeNode.
  - Directory nodes (`type='dir'`) maintain hierarchy without storing data (`blob=None`).
  - File nodes (`type='file'`) store filename and location metadata while pointing to a `Blob` for content.

Commits store a flat dictionary snapshot mapping file paths to Blob UUIDs:
```json
{
  "README.md": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "src/index.ts": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

### Directory Tree Generation

When a snapshot is saved, the tree construction algorithm decomposes flat file paths into relational nodes:
1. Every path string is split by the `/` delimiter into discrete path segments.
2. Intermediary segments represent directories and are instantiated as `TreeNode` records with `type='dir'`. A local lookup dictionary reuses already created directory records to prevent duplicate folders.
3. The final segment represents the file itself and is instantiated as a `TreeNode` with `type='file'`, referencing its assigned `blob_id`.
4. All records are inserted in database batches of 500 rows inside a single atomic transaction.

### Binary vs. Text Identification

During file ingestion, the backend determines whether incoming content is text or binary using an evaluation process:
1. The server reads the raw byte stream of the uploaded file.
2. It attempts to decode the bytes as standard UTF-8 text (`raw_content.decode('utf-8')`).
3. If decoding succeeds, the content is flagged with `is_binary=False` and stored as plain text.
4. If a `UnicodeDecodeError` is caught, the content contains non-text bytes:
   - The file is flagged with `is_binary=True`.
   - The MIME type is guessed using `mimetypes.guess_type(path)`.
   - The raw byte buffer is Base64 encoded and formatted into a Data URI string (`data:<mime_type>;base64,<encoded_data>`).
   - The Data URI is saved into the `Blob` record.

Downstream systems adapt to this flag: the diff engine skips line comparisons for binary files, the frontend renders images directly via data URIs, and the ZIP export service decodes base64 back into raw bytes.

### Diff Calculation Engine

Diff generation compares two commit snapshots (the Base commit of the target branch and the Head commit of the source branch):
1. Key Set Comparison: The union of all file paths across both snapshots is gathered.
2. Hash Matching Shortcut: If a file path exists in both commits with the identical `blob_id`, the file is untouched and skipped immediately without database lookups.
3. State Identification:
   - Present in Head but absent in Base: file is marked as `added`.
   - Present in Base but absent in Head: file is marked as `removed`.
   - Present in both with differing `blob_id`s: file is marked as `modified`.
4. Unified Diff Generation:
   - Unchanged files are omitted from the payload.
   - Text files are processed through Python's `difflib.unified_diff`, generating line-by-line diff arrays containing additions (`+`), deletions (`-`), and hunk metadata (`@@`).
   - Binary files produce a summary notice indicating binary divergence without line details.
5. Async Precomputation: Large diffs are calculated in the background using Celery workers upon PR creation or branch push, and persisted in `precomputed_diff` on the PullRequest model for immediate retrieval.

### Branch Merge Engine

Merging a pull request executes inside a strict transactional boundary:
1. Validation Gates:
   - PR must be open and not marked as a draft.
   - Target and source branches must exist.
   - Conflict check: Verifies `pr.base_commit == pr.target_branch.head_commit`. If the target branch has received other commits in the interim, the merge is rejected to prevent silent overwrites.
   - Protected Branch Rules: If the target branch has `is_protected=True`, the PR requires at least one approval from an assigned reviewer and zero outstanding changes requested.
2. Merge Commit Creation:
   - Creates a new `Commit` record containing two parents:
     - `parent`: The current head commit of the target branch.
     - `second_parent`: The head commit of the incoming source branch.
   - The commit snapshot contains the merged state of the source branch.
3. Tree Rebuilding:
   - A complete `Tree` and associated `TreeNode` hierarchy is generated for the merge commit.
4. Pointer Advance:
   - The target branch pointer (`head_commit`) is updated to the newly created merge commit.
   - The PR status transitions to `MERGED` with metadata for timestamp and merging user.
   - A domain event (`PR_MERGED`) is dispatched to trigger notifications and update activity streams.

### Real-Time Communication Layer

Real-time capabilities are powered by Django Channels, Daphne ASGI server, and a Redis channel layer:
- Notification Stream (`/ws/notifications/`): Authenticated per user. When an event fires (such as an assigned issue or PR review), a Celery worker sends a message to the user channel group, prompting the frontend notification bell to update instantly.
- Issue Board Stream (`/ws/repositories/<slug>/issues/`): Repository members subscribe to a shared room. Any state change on the Kanban board (drag-and-drop column change, title edit, deletion) broadcasts an `issue.event` payload to all connected clients, enabling live multi-user synchronization.
- Client Resilience: The frontend client (`ReconnectingWebSocketClient`) utilizes exponential backoff with randomized jitter (500ms to 30s) and automatic reconnection triggers upon connection drops.

### Asynchronous Processing and Event Bus

CollabHub implements a decoupled, event-driven internal bus:
- Domain Events: The system fires standard events (`PR_CREATED`, `PR_MERGED`, `PR_REVIEWED`, `ISSUE_CREATED`, `ISSUE_ASSIGNED`, `BRANCH_UPDATED`, `COMMENT_CREATED`).
- Event Dispatcher: Synchronous actions dispatch payloads via `dispatch_event(EVENT_TYPE, payload)`.
- Handlers and Background Tasks: Decorated handlers (`@event_handler`) intercept events and push jobs onto the Celery/Redis queue:
  - `activity`: Creates non-blocking historical timeline entries.
  - `notifications`: Generates deduplicated user notification rows and triggers WebSocket broadcasts.
  - `PullRequest`: Dispatches background jobs to recompute diffs when branch heads change.

### Authentication and Access Control

- Identity Model: `CustomUser` uses verified email addresses as the unique primary login field without legacy username requirements.
- Session and Token Strategy:
  - Dual support for HTTP-only JWT cookies (`access` and `refresh`) and `Authorization: Bearer <token>` headers via SimpleJWT and dj-rest-auth.
  - 15-minute access token lifespan with 1-day rotating refresh tokens. Old tokens are blacklisted on refresh.
  - Frontend Axios interceptor detects 401 Unauthorized errors and transparently performs single-flight token renewal before retrying requests.
- Social Authentication: Built-in OAuth 2.0 PKCE support for Google Identity and Microsoft Azure AD / Graph API.
- Role-Based Access Control (RBAC):
  - Admin (Priority 4): Full repository rights, member role management, repository settings, branch protection, deletion.
  - Maintainer (Priority 3): PR merges, branch protection, member invitations, issue and PR moderation.
  - Member (Priority 2): Branch creation, commit pushes, PR creation, issue management, commenting.
  - Viewer (Priority 1): Read-only repository access with commenting rights on public or assigned resources.

---

## Tech Stack

### Backend Frameworks and Services
- Django 5.2 (Core web framework)
- Django REST Framework 3.16 (REST API architecture)
- Django Channels 4.2 and Daphne 4.1 (ASGI WebSocket server)
- Celery 5.6 and django-celery-results (Distributed asynchronous job queue)
- Redis 7 (Message broker, Channels layer, session caching)
- PostgreSQL 18 (Production relational database with SSL connection pooling)
- SQLite (Local development database)
- SimpleJWT 5.5 and dj-rest-auth 7.1 (JWT lifecycle management)
- django-allauth 65.14 (OAuth 2.0 social identity provider integration)
- drf-spectacular 0.29 (OpenAPI 3.0 specification, Swagger UI, ReDoc generation)
- Whitenoise 6.9 (Static file compression and manifest serving)
- stream-zip (High-throughput memory-efficient ZIP archive streaming)

### Frontend Frameworks and Libraries
- React 19.2 (Component UI architecture)
- TypeScript 5.9 (Strict type validation across components and services)
- Vite 7.2 (Frontend bundling engine with Tailwind CSS integration)
- Tailwind CSS 4.1 (Utility styling utilizing OKLCH color spaces)
- Radix UI (Accessible headless UI primitives for dialogs, popovers, and selects)
- React Router DOM 7.12 (Client-side routing and nested layouts)
- Axios 1.13 (HTTP client with auth refresh interceptor)
- @dnd-kit (Accessible drag-and-drop engine powering the Kanban issue board)
- react-syntax-highlighter (Prism code highlighter supporting light and dark themes)
- react-markdown and remark-gfm (GitHub Flavored Markdown parsing and rendering)
- react-hot-toast (Toast feedback notifications)

### Infrastructure and Containerization
- Docker and Docker Compose (Multi-container orchestration with live code watch)
- Nginx 1.27 Alpine (Production frontend static asset server with SPA routing)
- Python 3.13 Slim with Astral uv (High-speed multi-stage backend container builds)
- Node.js 22 Alpine with pnpm (Frontend containerized build pipeline)
- GitHub Actions (Scheduled 4-minute keep-alive ping and daily automated Postgres backups)

---

## System Architecture Diagram

```
[ Browser / Client: React 19 + TypeScript ]
        |                              |
  HTTP REST Requests             WebSockets (ws://)
        |                              |
        v                              v
[ Nginx (Frontend) ]         [ Daphne ASGI Server (Backend) ]
        |                              |
        +------------+-----------------+
                     |
         [ Django REST Framework ]
         |           |           |
         |      Event Bus        |
         |           |           |
         v           v           v
    [ PostgreSql ] [ Redis ] [ Celery Worker ]
      - Storage      - Broker  - Diffs
      - Commits      - Channels- Notifications
      - Auth / Data  - Pub/Sub - File Processing
```

---

## Repository Structure

```
CollabHub/
|-- .github/
|   `-- workflows/
|       |-- backup.yml              # Nightly PostgreSQL automated backup workflow
|       `-- keep_alive.yml          # Scheduled 4-minute health ping workflow
|-- backend/
|   |-- accounts/                   # Authentication, CustomUser model, OAuth adapters
|   |-- activity/                   # Activity timeline models, handlers, and views
|   |-- branches/                   # Branch pointers, Commit snapshots, and views
|   |-- comments/                   # Polymorphic GenericForeignKey comment engine
|   |-- common/                     # CommonModel mixin, health checks, WebSocket consumers
|   |-- config/                     # Settings, URL routing, ASGI/WSGI, event bus, access control
|   |-- issues/                     # Kanban issues, labels, real-time board consumers
|   |-- notifications/              # In-app notifications, WebSocket push, deduplication
|   |-- PullRequest/                # PR models, diff precomputation, code reviews, merge logic
|   |-- repositories/               # Repository management, members, file tree, uploads
|   |-- scripts/                    # Database maintenance scripts (backup_db.sh)
|   |-- storage/                    # Content-Addressable Storage (Blob, Tree, TreeNode)
|   |-- Dockerfile                  # Multi-stage Python 3.13 backend container
|   |-- entrypoint.sh               # Initialization script (migrations, collectstatic, admin creation)
|   `-- requirements.txt            # Locked Python dependencies
|-- frontend/
|   |-- public/                     # Static assets and favicon files
|   |-- src/
|   |   |-- 404 section/            # Not found page component
|   |   |-- assets/                 # SVGs, icons, and static graphics
|   |   |-- axios/                  # Axios instance and automatic token refresh interceptor
|   |   |-- components/             # React views, navigation, dashboards, and dialogues
|   |   |   |-- Header Components/  # Authentication dialogs and notification panels
|   |   |   |-- Profile Components/ # User profile tabs and editor forms
|   |   |   |-- RepoUI Component/   # File explorer, code viewer, branches, PRs, issues
|   |   |   |-- dashboard/          # Dashboard panels, repo sidebars, and metrics
|   |   |   `-- ui/                 # Reusable shadcn/ui components (buttons, dialogs, inputs)
|   |   |-- Context/                # Context providers (UserContext, ThemeContext, ToastProvider)
|   |   |-- hooks/                  # Custom hooks (useBackendKeepAlive)
|   |   |-- lib/                    # Pagination helpers, toast wrappers, styling utilities
|   |   |-- websocket/              # Reconnecting WebSocket client and realtime subscriptions
|   |   |-- App.tsx                 # Root router configuration
|   |   |-- index.css               # Tailwind CSS v4 design tokens and theme rules
|   |   `-- main.tsx                # Client entry point
|   |-- Dockerfile                  # Multi-stage Node builder and Nginx runtime container
|   |-- package.json                # Frontend package manifest and build scripts
|   |-- pnpm-lock.yaml              # Frozen dependency lockfile
|   |-- tsconfig.json               # TypeScript compiler options
|   `-- vite.config.ts              # Vite configuration and path aliases
`-- docker-compose.yml              # Multi-container orchestration specification
```

---

## Database Schema and Models

### Storage Models (`storage`)
- `Blob`:
  - `id`: UUID (Primary Key)
  - `content`: TextField (Raw string data or Base64 Data URI)
  - `content_hash`: CharField(64) (Indexed SHA-256 digest)
  - `is_binary`: BooleanField
  - `created_at`: DateTimeField
- `Tree`:
  - `id`: UUID (Primary Key)
  - `commit`: OneToOneField -> `branches.Commit`
  - `created_at`: DateTimeField
- `TreeNode`:
  - `id`: UUID (Primary Key)
  - `tree`: ForeignKey -> `Tree`
  - `name`: CharField(255)
  - `path`: TextField
  - `type`: CharField choices (`file`, `dir`)
  - `parent`: ForeignKey -> `self` (Nullable)
  - `blob`: ForeignKey -> `Blob` (Nullable, populated only for files)

### Identity Models (`accounts`)
- `CustomUser`:
  - `id`: BigAutoField
  - `email`: EmailField (Unique, primary identifier, Trigram indexed)
  - `first_name`: CharField(30)
  - `last_name`: CharField(30)
  - `bio`: TextField
  - Standard Django flags (`is_active`, `is_staff`, `is_superuser`)

### Repository Models (`repositories` and `branches`)
- `Repository`:
  - `name`: CharField(255)
  - `slug`: SlugField(255, Unique)
  - `owner`: ForeignKey -> `CustomUser`
  - `description`: TextField
  - `visibility`: CharField choices (`public`, `private`)
  - `default_branch`: CharField(255, default='main')
- `RepositoryMember`:
  - `repository`: ForeignKey -> `Repository`
  - `developer`: ForeignKey -> `CustomUser`
  - `role`: CharField choices (`admin`, `maintainer`, `member`, `viewer`)
- `Branches`:
  - `name`: CharField(100)
  - `repository`: ForeignKey -> `Repository`
  - `is_default`: BooleanField
  - `is_protected`: BooleanField
  - `head_commit`: ForeignKey -> `Commit`
- `Commit`:
  - `repository`: ForeignKey -> `Repository`
  - `branch`: ForeignKey -> `Branches`
  - `parent`: ForeignKey -> `self` (Nullable)
  - `second_parent`: ForeignKey -> `self` (Nullable, set on merge commits)
  - `message`: CharField(255)
  - `author`: ForeignKey -> `CustomUser`
  - `snapshot`: JSONField (Dictionary mapping paths to Blob UUIDs)

### Collaboration Models (`PullRequest`, `issues`, `comments`)
- `PullRequest`:
  - `repo`: ForeignKey -> `Repository`
  - `source_branch`: ForeignKey -> `Branches`
  - `target_branch`: ForeignKey -> `Branches`
  - `base_commit`: ForeignKey -> `Commit`
  - `title`: CharField(100)
  - `description`: TextField
  - `status`: CharField choices (`OPEN`, `MERGED`, `CLOSED`)
  - `is_draft`: BooleanField
  - `diff_status`: CharField choices (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)
  - `precomputed_diff`: JSONField
- `Review`:
  - `pr`: ForeignKey -> `PullRequest`
  - `reviewer`: ForeignKey -> `CustomUser`
  - `status`: CharField choices (`APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`)
- `Issue`:
  - `repo`: ForeignKey -> `Repository`
  - `title`: CharField(100)
  - `description`: TextField
  - `status`: CharField choices (`open`, `in_progress`, `closed`)
  - `creator`: ForeignKey -> `CustomUser`
  - `parent`: ForeignKey -> `self` (Nullable, for task subtrees)
- `Label`:
  - `repo`: ForeignKey -> `Repository`
  - `name`: CharField(100)
  - `color`: CharField(7, Hex format)
- `Comment`:
  - `content_type`: ForeignKey -> `ContentType`
  - `object_id`: PositiveIntegerField (Targets Issue, PullRequest, Review, or Commit)
  - `author`: ForeignKey -> `CustomUser`
  - `content`: TextField
  - `parent`: ForeignKey -> `self` (For threaded responses)
  - Code reference fields: `path`, `line_number`, `side` (`old` or `new`)

---

## REST API Reference

### System Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/health/` | Unauthenticated status check returning database connectivity |

### Authentication (`/api/accounts/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/register/` | Register new account with email and password |
| PUT, PATCH | `/register/` | Update authenticated user profile |
| POST | `/login/` | Authenticate with credentials and receive JWT cookies and tokens |
| POST | `/refresh/` | Rotate expired access token using refresh token |
| POST | `/logout/` | Invalidate refresh token and clear auth cookies |
| GET | `/me/` | Retrieve current authenticated user record |
| GET | `/profile-summary/` | Aggregate counts for user repositories, PRs, issues, and notifications |
| POST | `/google/` | Exchange Google OAuth authorization code for session tokens |
| POST | `/microsoft/` | Exchange Microsoft authorization code for session tokens |

### Repositories (`/api/repositories/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/public/` | List all public repositories |
| GET, POST | `/` | List accessible repositories / Create repository |
| GET, PUT, PATCH, DELETE | `/<slug>/` | Retrieve, update, or remove repository |
| GET | `/<slug>/options/` | Retrieve allowed visibility choices and role definitions |
| GET | `/<slug>/members/` | List repository collaborators and roles |
| POST | `/<slug>/add-member/` | Invite collaborator with designated role |
| DELETE | `/<slug>/remove-member/` | Remove collaborator or self-leave from repository |
| PATCH | `/<slug>/members/<id>/role/` | Update member permission tier |
| GET | `/<slug>/my-role/` | Return current user permissions inside repository |
| GET | `/<slug>/search-users/` | Search eligible users for invitation |
| GET | `/<slug>/readme/` | Fetch README content from head of default branch |
| GET | `/<slug>/tree/` | Browse directory hierarchy (`?branch=&path=`) |
| GET | `/<slug>/file-content/` | Retrieve raw file content and metadata (`?branch=&path=`) |
| POST | `/<slug>/file-upload/` | Synchronously upload files and commit to branch |
| POST | `/<slug>/async-file-upload/` | Asynchronously enqueue file upload processing via Celery |
| GET | `/<slug>/upload-status/<task_id>/` | Poll background file processing status |
| GET | `/<slug>/download-zip/` | Stream entire repository branch as a ZIP archive |
| GET | `/<slug>/download-file/` | Stream single file download (`?branch=&path=`) |
| GET | `/<slug>/commits/` | List chronological commit history for branch |
| GET | `/<slug>/commit-diff/` | Compute raw diff between two commit IDs (`?base_id=&head_id=`) |
| POST | `/<slug>/missing-objects/` | Identify missing blobs for Git push optimization |
| POST | `/<slug>/push/` | Ingest commit metadata and blobs from CLI client |

### Branches (`/api/repositories/<slug>/branches/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET, POST | `/` | List all repository branches / Create branch |
| GET, PUT, PATCH, DELETE | `/<pk>/` | Retrieve branch, update protection status, or delete |
| GET | `/<pk>/commits/` | List commit log for specified branch |

### Pull Requests (`/api/repositories/<slug>/pull-requests/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET, POST | `/` | List pull requests / Open new pull request |
| GET, PUT, PATCH, DELETE | `/<pk>/` | Retrieve PR details, edit description, or remove |
| POST | `/<pk>/merge/` | Merge PR into target branch |
| POST | `/<pk>/close/` | Close open pull request |
| POST | `/<pk>/reopen/` | Reopen closed pull request |
| POST | `/<pk>/ready-for-review/` | Convert draft PR to ready for review |
| POST | `/<pk>/convert-to-draft/` | Convert ready PR into draft status |
| GET | `/<pk>/diff/` | Retrieve paginated precomputed diffs |
| GET, PATCH | `/<pk>/viewed-files/` | Read or update file review checkmarks |
| GET, POST | `/<pr_pk>/reviews/` | List reviews / Submit review verdict |
| POST | `/<pr_pk>/reviews/<pk>/approve/` | Submit approval review |
| POST | `/<pr_pk>/reviews/<pk>/changes_requested/` | Request modifications from author |

### Issues (`/api/repositories/<slug>/issues/` and `labels/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET, POST | `/issues/` | List repository issues / Open new issue |
| GET, PUT, PATCH, DELETE | `/issues/<pk>/` | Retrieve issue, update status/fields, or delete |
| POST | `/issues/<pk>/assign/` | Assign or reassign user to issue |
| GET, POST | `/labels/` | List labels / Create custom label |
| GET, PUT, PATCH, DELETE | `/labels/<pk>/` | Update label metadata or remove label |

### Comments (`/api/repositories/<slug>/comments/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET, POST | `/` | List threaded comments / Post comment or inline review note |
| GET, PUT, PATCH, DELETE | `/<pk>/` | Retrieve, edit, or delete comment |

### Activity and Notifications
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/repositories/<slug>/activity/` | Paginated chronological activity log for repository |
| GET | `/api/notifications/` | List authenticated user notifications (`?is_read=`) |
| GET | `/api/notifications/unread_count/` | Return total unread notification count |
| POST | `/api/notifications/<id>/mark_read/` | Mark single notification as read |
| POST | `/api/notifications/mark_all_read/` | Mark all notifications as read |
| DELETE | `/api/notifications/clear_all/` | Remove all notification records for user |

---

## WebSocket Protocol Reference

All WebSocket connections must be routed through Daphne or an ASGI compatible gateway.

### 1. Notifications Stream
- Path: `ws://<host>/ws/notifications/`
- Authentication: Session-based or JWT token cookie.
- Channel Group: `user_<user_id>_notifications`
- Outbound Payload Example:
  ```json
  {
    "type": "notification.new"
  }
  ```

### 2. Issue Board Realtime Stream
- Path: `ws://<host>/ws/repositories/<slug>/issues/?token=<access_token>`
- Authentication: Query parameter token validation against `CustomUser` membership.
- Channel Group: `repo.<slug>.issues`
- Outbound Payload Example:
  ```json
  {
    "type": "issue.event",
    "event": "issue_moved",
    "data": {
      "issue_id": 42,
      "status": "in_progress",
      "updated_by": "developer@example.com"
    }
  }
  ```

### 3. Server Health Probe
- Path: `ws://<host>/ws/health/`
- Inbound: `{"type": "health.ping"}`
- Outbound: `{"type": "health.pong"}`

---

## Local Development Setup

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+ OR:
  - Python 3.13+
  - Node.js 22+ with pnpm
  - Redis 7+
  - PostgreSQL 16+ or SQLite

---

### Option A: Docker Compose (Recommended)

The included `docker-compose.yml` configures the backend, frontend, Redis, and Celery services with code-syncing watchers.

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/CollabHub.git
   cd CollabHub
   ```

2. Create backend and frontend environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Launch services:
   ```bash
   docker compose up --build
   ```

4. Service access points:
   - Frontend Application: `http://localhost:5173`
   - Backend API Service: `http://localhost:8001/api/`
   - Interactive API Documentation: `http://localhost:8001/api/docs/`
   - Redis Instance: `localhost:6379`

---

### Option B: Manual Local Setup

#### 1. Redis Service
Ensure Redis is running locally on default port 6379:
```bash
redis-server
```

#### 2. Backend Service
```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies using pip or uv
pip install -r requirements.txt

# Apply migrations and collect static files
python manage.py migrate
python manage.py collectstatic --no-input

# Create administrative user
python manage.py createsuperuser

# Start Daphne ASGI development server
daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

#### 3. Celery Worker Service
Open a separate terminal window:
```bash
cd backend
source venv/bin/activate       # Windows: venv\Scripts\activate
celery -A config worker --loglevel=info --concurrency=2
```

#### 4. Frontend Service
Open another terminal window:
```bash
cd frontend

# Install Node dependencies
pnpm install

# Start Vite development server
pnpm dev
```
The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | Yes | - | Cryptographic salt for Django sessions and signing |
| `DEBUG` | No | `True` | Enables debug mode and detailed error stack traces |
| `ALLOWED_HOSTS` | No | `localhost,127.0.0.1` | Permitted hostnames for incoming HTTP requests |
| `DATABASE_URL` | No | SQLite local path | PostgreSQL database connection string |
| `REDIS_URL` | No | `redis://127.0.0.1:6379/0` | Primary Redis connection string |
| `CELERY_BROKER_URL` | No | `redis://127.0.0.1:6379/0` | Celery broker URL |
| `CELERY_RESULT_BACKEND`| No | `redis://127.0.0.1:6379/0` | Celery task result backend |
| `CHANNEL_REDIS_URL` | No | `redis://127.0.0.1:6379/1` | Redis layer URL for Channels WebSockets |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed origin for CORS headers and callbacks |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-delimited list of permitted CORS origins |
| `CSRF_TRUSTED_ORIGINS` | No | `http://localhost:5173` | Comma-delimited list of CSRF origins |
| `GOOGLE_CLIENT_ID` | No | - | OAuth 2.0 client ID for Google authentication |
| `GOOGLE_CLIENT_SECRET`| No | - | OAuth 2.0 secret for Google authentication |
| `MICROSOFT_CLIENT_ID` | No | - | Client ID for Microsoft Azure authentication |
| `MICROSOFT_CLIENT_SECRET`| No | - | Secret for Microsoft Azure authentication |

### Frontend Configuration (`frontend/.env`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | No | `http://localhost:8001/api` | Target backend REST API base URL |
| `VITE_WS_BASE_URL` | No | Auto-detected | Base endpoint for WebSocket connections |
| `VITE_GOOGLE_CLIENT_ID` | No | - | Client ID used in Google OAuth popup and redirects |
| `VITE_MICROSOFT_CLIENT_ID`| No | - | Client ID used in Microsoft OAuth redirects |
| `VITE_OAUTH_REDIRECT_URI` | No | `http://localhost:5173/auth/callback` | OAuth provider redirect target |

---

## Testing and Quality Assurance

### Backend Unit and Integration Tests
Backend tests cover models, permissions, CAS services, diff generators, and API endpoints:

```bash
cd backend

# Execute entire test suite
python manage.py test

# Execute test suite for a specific module
python manage.py test accounts
python manage.py test repositories
python manage.py test PullRequest
python manage.py test storage
```

### Frontend Type Validation and Linting
```bash
cd frontend

# Verify TypeScript types and compile build assets
pnpm build

# Run ESLint validation
pnpm lint
```

---

## Production Deployment and CI/CD

### Production Architecture
- Web Hosting: Render PaaS hosting Docker containers running Daphne ASGI behind an Nginx reverse proxy.
- Database: Managed PostgreSQL instance configured with connection limits and mandatory SSL (`sslmode=require`).
- Cache and Broker: Managed Redis instance handling Celery queues and Channels layers over TLS (`rediss://`).
- Static Files: Compressed and fingerprinted via WhiteNoise.

### CI/CD Workflows (`.github/workflows/`)
1. Database Backup Workflow (`backup.yml`):
   - Runs on a daily schedule (`0 0 * * *`) and via manual dispatch.
   - Installs official PostgreSQL 18 tools using `/etc/apt/keyrings`.
   - Generates a custom-format dump using `pg_dump`.
   - Stores the backup in GitHub Actions artifacts with a 30-day retention window.
   - Retains the latest 7 backup files on disk.
2. Server Keep-Alive Workflow (`keep_alive.yml`):
   - Executes every 4 minutes (`*/4 * * * *`).
   - Dispatches an HTTP GET request to `/api/health/` using `curl` to keep server containers active and prevent free-tier inactivity sleeping.
