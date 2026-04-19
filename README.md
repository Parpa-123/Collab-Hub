# CollabHub

**CollabHub** is a full-stack developer collaboration platform inspired by GitHub, built from the ground up with Django REST Framework and React. It provides a complete suite of tools for repository management, version control, code review, and team collaboration — all deployable on a single virtual machine.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

CollabHub replicates the core workflows of modern source code hosting platforms within a self-hosted, containerised environment. It enables developers to create and manage repositories, track files across branches, open and review pull requests with inline diff commenting, manage issues with labels and assignees, and receive real-time notifications — all through a polished, responsive web interface.

The platform is architected to run efficiently on resource-constrained infrastructure, including the Google Compute Engine free-tier (e2-micro, 1 GB RAM), making it suitable for small teams, educational environments, and personal use.

---

## Architecture

```
Client Browser
      │
      ▼
    Nginx (port 80)
      │
      ├── /          → React SPA (static files)
      ├── /api/      → Django REST Framework (Gunicorn)
      ├── /admin/    → Django Admin
      └── /static/   → Django Static Files (WhiteNoise)
                          │
                          ▼
                      Redis (Broker)
                          │
                          ▼
                    Celery Worker (Async Tasks)
```

All services are orchestrated via Docker Compose with memory-constrained containers for production stability.

---

## Key Features

### Repository Management
- **Create, update, and delete** repositories with public or private visibility.
- **Role-based access control** — Owner, Admin, Maintainer, and Member roles with granular permissions enforced at the API level.
- **Slug-based routing** for clean, human-readable repository URLs.
- **Dual-view repository listing** — toggle between list and grid layouts with real-time search and visibility filtering.

### Git-like Version Control
- **Branch management** — create, protect, and delete branches with tracked parentage (`created_from`).
- **Commit history** with parent tracking, merge parents, and JSON-based file snapshots.
- **Content-addressable storage** — file contents are stored as SHA-256-hashed blobs, ensuring deduplication across the entire platform.
- **Tree-based file system** — each commit references a tree of nodes (files and directories), faithfully modelling Git's internal object structure.
- **File explorer** with in-browser file viewing and commit-linked uploads.

### Pull Requests & Code Review
- **Full pull request lifecycle** — open, close, reopen, and merge with status tracking.
- **Asynchronous diff computation** — diffs are precomputed in the background via Celery, with status tracking (Pending → Processing → Completed/Failed).
- **Conflict detection** — automatically identifies when the target branch has advanced beyond the PR's base commit.
- **Merge eligibility checks** — enforces at least one approval and no outstanding change requests before permitting a merge.
- **Code reviews** with approval, changes requested, and comment statuses, constrained to one review per reviewer per pull request.
- **Inline diff commenting** — comments are anchored to specific file paths, line numbers, and diff sides (old/new).

### Issue Tracking
- **Issue lifecycle** — Open, In Progress, and Closed statuses with timestamp tracking.
- **Labels** with custom colours and descriptions, scoped per repository.
- **Assignee management** through a dedicated junction model with assignment timestamps.
- **Hierarchical issues** — issues may reference a parent issue, enabling sub-task organisation.

### Comments System
- **Polymorphic comments** — a single, generic comment model attaches to pull requests, reviews, commits, and issues via Django's `ContentType` framework.
- **Threaded replies** — comments support nested parent-child relationships for structured discussions.
- **Inline code comments** — comments on pull request diffs are anchored to file path, line number, and side (old/new).

### Notifications & Activity
- **Event-driven notifications** — creating pull requests, issues, and reviews automatically dispatches notifications to relevant recipients via Celery tasks.
- **Generic activity log** — all significant actions (commits, PR merges, issue updates) are recorded in a per-repository activity feed with actor, verb, and content-object tracking.
- **Read/unread management** with timestamps and indexed queries for performant retrieval.
- **Real-time notification panel** in the frontend header with badge counts.

### Authentication & Security
- **JWT-based authentication** with HTTP-only cookie storage, automatic token rotation, and blacklisting of rotated refresh tokens.
- **OAuth 2.0 integration** — Google and Microsoft social login via `django-allauth`, with a custom social account adapter for seamless onboarding.
- **CORS and CSRF protection** fully configurable via environment variables, with sensible defaults.
- **Automatic token refresh** — the Axios interceptor transparently refreshes expired access tokens without user intervention.

### Frontend Experience
- **Responsive, theme-aware UI** — full light and dark mode support with system-preference detection and manual toggling.
- **Dashboard** with greeting banner, repository sidebar with search, activity feed, and statistics overview.
- **User profile management** with in-app editing.
- **User menu dropdown** with profile navigation, repositories link, and sign-out confirmation dialog.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Django 5.2, Django REST Framework 3.16 |
| **Authentication** | SimpleJWT, dj-rest-auth, django-allauth |
| **Task Queue** | Celery 5.6 with Redis 7 as broker and result backend |
| **API Documentation** | drf-spectacular (OpenAPI 3.0, Swagger UI, ReDoc) |
| **Frontend Framework** | React 19, TypeScript, Vite 7 |
| **Styling** | Tailwind CSS 4, Radix UI primitives |
| **HTTP Client** | Axios with interceptor-based token management |
| **Routing** | React Router DOM 7 |
| **Reverse Proxy** | Nginx (Alpine) |
| **Database** | SQLite (development/single-VM) or PostgreSQL (production) |
| **Static Files** | WhiteNoise with compressed manifest storage |
| **Containerisation** | Docker, Docker Compose |

---

## Project Structure

```
CollabHub/
├── backend/
│   ├── accounts/          # Custom user model, OAuth, JWT auth
│   ├── activity/          # Generic activity logging
│   ├── branches/          # Branch and commit management
│   ├── comments/          # Polymorphic comment system
│   ├── common/            # Shared base model (CommonModel)
│   ├── config/            # Django settings, URLs, WSGI, Celery
│   ├── issues/            # Issue tracking with labels and assignees
│   ├── notifications/     # Event-driven notification system
│   ├── PullRequest/       # PR lifecycle, reviews, diff computation
│   ├── repositories/      # Repository CRUD, membership, file management
│   ├── storage/           # Content-addressable blob and tree storage
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Pages and UI components
│   │   ├── Context/       # React contexts (Auth, Theme, Toast)
│   │   ├── axios/         # Axios instance with interceptors
│   │   └── lib/           # Utilities (pagination, toast, etc.)
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 22+](https://nodejs.org/) with [pnpm](https://pnpm.io/) (for local frontend development)
- [Python 3.11+](https://www.python.org/) (for local backend development)

### Local Development

**Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Production (Docker Compose)

```bash
# 1. Build the frontend
cd frontend && pnpm install && pnpm build && cd ..

# 2. Start all services
docker compose up -d --build

# 3. Access the application
open http://localhost
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django secret key | *required* |
| `DEBUG` | Enable debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection string (optional) | SQLite fallback |
| `CELERY_BROKER_URL` | Redis broker URL | `redis://127.0.0.1:6379/0` |
| `CELERY_RESULT_BACKEND` | Redis result backend URL | `redis://127.0.0.1:6379/0` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | — |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | — |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | — |
| `FRONTEND_URL` | Frontend origin URL | `http://localhost:5173` |
| `SECURE_SSL_REDIRECT` | Enforce HTTPS redirects | `false` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `VITE_MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | — |
| `VITE_OAUTH_REDIRECT_URI` | OAuth callback URL | `http://localhost:5173/auth/callback` |

---

## API Documentation

When the backend is running, interactive API documentation is available at:

| Format | URL |
|---|---|
| Swagger UI | `http://localhost:8000/api/docs/` |
| ReDoc | `http://localhost:8000/api/redoc/` |
| OpenAPI Schema | `http://localhost:8000/api/schema/` |

### Principal API Endpoints

| Resource | Endpoint |
|---|---|
| Authentication | `/api/accounts/` |
| Repositories | `/api/repositories/` |
| Branches | `/api/repositories/:slug/branches/` |
| Pull Requests | `/api/repositories/:slug/pull-requests/` |
| Issues | `/api/repositories/:slug/issues/` |
| Comments | `/api/repositories/:slug/comments/` |
| Activity | `/api/repositories/:slug/activity/` |
| Notifications | `/api/notifications/` |

---

## Deployment

CollabHub is designed to run on minimal infrastructure. The recommended deployment target is a **Google Compute Engine e2-micro instance** (1 vCPU, 1 GB RAM) using Docker Compose.

The Docker Compose configuration includes:
- **Nginx** — reverse proxy serving the React SPA and forwarding API requests to Django
- **Backend** — Django application served by Gunicorn with a single worker
- **Celery** — asynchronous task worker with concurrency of 1
- **Redis** — message broker with memory-limited configuration

All containers are configured with logging limits and restart policies for unattended operation.

---

## License

This project is developed for educational and portfolio purposes.
