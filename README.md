# CollabHub

A full-stack Git-inspired collaboration platform for repository management, pull requests, issue tracking, and real-time collaboration.

Live Demo: https://collab-hub-1.onrender.com

## Overview

CollabHub is an open-source developer collaboration platform built with Django REST Framework, Django Channels, Celery, and React 19. It provides Git-like content-addressable storage, real-time activity streaming, precomputed code diffs, polymorphic commenting, and comprehensive issue tracking.

## Tech Stack

### Backend
- **Django 5.2** - Web framework
- **Django REST Framework 3.16** - API framework
- **Django Channels 4.2** - WebSocket support
- **Celery 5.6** - Distributed task queue
- **PostgreSQL** - Production database (SQLite for development)
- **Redis 7** - Caching, Celery broker, Channels layer
- **SimpleJWT** - JWT authentication with HTTP-only cookies
- **django-allauth** - Social authentication (Google, Microsoft OAuth 2.0)
- **drf-spectacular** - OpenAPI documentation

### Frontend
- **React 19.2** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7.2** - Build tool
- **Tailwind CSS 4.1** - Styling
- **Radix UI** - Accessible component primitives
- **React Router DOM 7.12** - Routing
- **Axios** - HTTP client
- **react-markdown** - Markdown rendering

## Features

### Repository Management
- Public and private repositories
- Role-based access control (Owner, Admin, Maintainer, Member)
- File tree navigation and content viewing
- Git-like push operations with commit history
- Snapshot-based version control

### Pull Requests
- Draft and ready-for-review states
- Precomputed async diff generation
- Merge eligibility checks with conflict detection
- Review system (Approve, Request Changes, Comment)
- Viewed files tracking per user
- Protected branch enforcement

### Issue Tracking
- Status workflow (Open, In Progress, Closed)
- Custom labels with colors
- Parent-child issue relationships (epics/subtasks)
- Assignee management
- Real-time WebSocket updates

### Comments
- Polymorphic commenting across PRs, Issues, Commits, and Reviews
- Threaded replies
- Line-number anchoring for code reviews
- Side selection for diff comments (old/new)

### Activity & Notifications
- Event-driven activity logging
- Real-time notification broadcasting via WebSockets
- Unread count tracking
- Mark all read functionality

### Content-Addressable Storage
- SHA-256 hashing for file deduplication
- Git-like blob and tree storage
- Binary file support with Base64 encoding

## Project Structure

```
.
├── backend/
│   ├── accounts/          # User authentication, JWT, OAuth
│   ├── activity/          # Activity stream and event handlers
│   ├── branches/          # Branch and commit management
│   ├── comments/          # Polymorphic comment system
│   ├── common/            # Shared model mixins
│   ├── config/            # Django settings, URLs, ASGI/WSGI
│   ├── issues/            # Issue tracking
│   ├── notifications/     # User notifications
│   ├── PullRequest/       # Pull request engine
│   ├── repositories/      # Repository CRUD and file operations
│   ├── storage/           # Content-addressable file storage
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components and pages
│   │   ├── Context/       # React contexts (User, Theme)
│   │   ├── axios/         # Axios interceptors
│   │   ├── lib/           # Utilities
│   │   ├── ui/            # UI primitives
│   │   └── websocket/     # WebSocket client
│   └── package.json
├── docker-compose.yml
└── .github/workflows/     # CI/CD workflows
```

## API Endpoints

### Authentication (`/api/accounts/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/` | User registration |
| POST | `/login/` | JWT token obtain |
| POST | `/refresh/` | Token refresh |
| POST | `/logout/` | Logout |
| GET | `/me/` | Current user info |
| GET | `/profile-summary/` | User dashboard stats |
| POST | `/google/` | Google OAuth |
| POST | `/microsoft/` | Microsoft OAuth |

### Repositories (`/api/repositories/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET, POST | `/` | List/create repositories |
| GET, PUT, DELETE | `/<slug>/` | Repository CRUD |
| GET | `/<slug>/members/` | List members |
| POST | `/<slug>/add-member/` | Add member |
| DELETE | `/<slug>/remove-member/` | Remove member |
| PATCH | `/<slug>/members/<id>/role/` | Update role |
| GET | `/<slug>/search-users/` | Search users |
| POST | `/<slug>/file-upload/` | Upload files |
| POST | `/<slug>/async-file-upload/` | Async file upload |
| GET | `/<slug>/tree/` | File tree |
| GET | `/<slug>/file-content/` | File content |
| POST | `/<slug>/push/` | Git-like push |
| GET | `/<slug>/commits/` | Commit history |
| GET | `/<slug>/commit-diff/` | Diff between commits |

### Pull Requests (`/api/repositories/<slug>/pull-requests/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET, POST | `/` | List/create PRs |
| GET, PUT, DELETE | `/<pk>/` | PR CRUD |
| POST | `/<pk>/merge/` | Merge PR |
| POST | `/<pk>/close/` | Close PR |
| POST | `/<pk>/reopen/` | Reopen PR |
| POST | `/<pk>/ready-for-review/` | Mark ready |
| POST | `/<pk>/convert-to-draft/` | Convert to draft |
| GET | `/<pk>/diff/` | Precomputed diff |
| GET, PATCH | `/<pk>/viewed-files/` | Track viewed files |
| GET, POST | `/<pk>/reviews/` | List/create reviews |

### Issues (`/api/repositories/<slug>/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET, POST | `/issues/` | List/create issues |
| GET, PUT, DELETE | `/issues/<pk>/` | Issue CRUD |
| POST | `/issues/<pk>/assign/` | Assign user |
| GET, POST | `/labels/` | Label management |

### Activity (`/api/repositories/<slug>/activity/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Activity feed |

### Notifications (`/api/notifications/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List notifications |
| POST | `/mark_all_read/` | Mark all as read |
| DELETE | `/clear_all/` | Clear all |
| POST | `/<pk>/mark_read/` | Mark single as read |
| GET | `/unread_count/` | Unread count |

## Database Models

### Core Relationships
```
CustomUser (accounts)
    ├── Repository (owner)
    ├── Issue (creator, assignees)
    ├── PullRequest (created_by, merged_by)
    ├── Review (reviewer)
    └── Comment (author)

Repository
    ├── RepositoryMember (many-to-many through)
    ├── Branches
    ├── Issue
    ├── PullRequest
    └── Label

PullRequest
    ├── source_branch, target_branch
    ├── Review
    └── PullRequestViewedFile

Issue
    ├── labels (many-to-many)
    ├── assignees (many-to-many)
    └── parent (self-referential for subtasks)

Comment (Polymorphic)
    ├── content_type, object_id (GenericForeignKey)
    └── parent (threaded replies)
```

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 22+
- Redis 7+
- PostgreSQL (production) or SQLite (development)

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/CollabHub.git
cd CollabHub

# Create backend environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Build and run all services
docker compose up --build

# Services available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8001
# - Redis: localhost:6379
```

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver

# In another terminal, start Celery worker
celery -A config worker --loglevel=info
```

#### Frontend

```bash
cd frontend

# Install dependencies
pnpm install
# or: npm install

# Start development server
pnpm dev
# or: npm run dev
```

### Environment Variables

Create `backend/.env`:

```env
# Required
SECRET_KEY=your-secret-key
DEBUG=True

# Database (production)
DATABASE_URL=postgres://user:password@host:5432/dbname

# Redis
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/0

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## Testing

Each Django app contains a `tests/` directory with comprehensive test coverage:

```bash
# Run all tests
python manage.py test

# Run tests for specific app
python manage.py test accounts
python manage.py test repositories
python manage.py test PullRequest
```

## API Documentation

Access the OpenAPI schema at `/api/schema/` and Swagger UI at `/api/docs/` when the backend is running.

## Deployment

### Production Configuration

The application is configured for deployment on Render PaaS:

- **Database**: PostgreSQL with SSL
- **Redis**: Upstash Redis (rediss://)
- **Static Files**: Whitenoise
- **ASGI Server**: Daphne
- **Security**: SSL enforcement, secure cookies, CSRF protection

### Docker Services

| Service | Description | Port |
|---------|-------------|------|
| redis | Redis 7 Alpine | 6379 (internal) |
| backend | Daphne ASGI server | 8001 |
| celery | Celery worker | - |
| frontend | React dev server | 5173 |

### CI/CD

- Daily PostgreSQL database backups via GitHub Actions
- 30-day artifact retention
- Automated backup scripts

## Architecture Highlights

### Event-Driven System
- Decoupled event handlers for notifications and activity logging
- Handler registry with decorator-based registration
- Event types: PR_CREATED, PR_MERGED, ISSUE_CREATED, etc.

### Async Task Processing
- Celery-powered background tasks
- Async file upload processing
- Precomputed diff generation
- Activity logging

### Real-Time Updates
- Django Channels with Redis channel layer
- WebSocket connections for live updates
- Automatic reconnection handling

### Authentication Flow
- JWT tokens in HTTP-only cookies
- Access token: 15 minutes
- Refresh token: 1 day
- Token rotation and blacklisting
- OAuth 2.0 with PKCE (Google)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.
