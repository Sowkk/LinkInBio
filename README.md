# LinkInBio — Link in Bio Platform

A full-stack Linktree-style platform where users can create a personalized public page with all their important links, track click analytics, and share a single URL everywhere.

**Live Demo** → `http://localhost` (run with Docker)

---

## Features

- **Custom public page** — share one URL like `yourapp.com/username` with all your links
- **Link management** — add, edit, delete, reorder, and toggle links live/hidden
- **Click analytics** — track total clicks, daily breakdown, and device types per link
- **JWT authentication** — secure register/login with bcrypt password hashing
- **Redis caching** — public profiles cached for performance, invalidated on every write
- **Background click tracking** — redirects happen instantly, analytics recorded asynchronously
- **Fully containerized** — runs with a single `docker-compose up` command

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database | PostgreSQL + SQLAlchemy ORM |
| Cache | Redis |
| Frontend | React, Vite, Zustand |
| Auth | JWT + bcrypt |
| Deployment | Docker, Docker Compose, nginx |

---

## Architecture

```
Browser → nginx (port 80)
              ↓
         React Frontend
              ↓
         FastAPI Backend (port 8000)
           ↙        ↘
    PostgreSQL      Redis
    (persistent)    (cache + rate limit)
```

**Key design decisions:**
- **Cache-Aside pattern** — public profiles served from Redis, falls back to PostgreSQL on cache miss, invalidated on every write
- **Background Tasks** — click events recorded asynchronously after redirect so users never wait
- **302 redirects** (not 301) — ensures every click always hits our server for tracking, preventing browser caching
- **UUID primary keys** — prevents sequential ID enumeration attacks
- **Wildcard route last** — `/{username}` registered after all specific routes to prevent conflicts

---

## Running Locally with Docker

**Prerequisites** — Docker Desktop installed and running

```bash
# Clone the repo
git clone https://github.com/Sowkk/LinkInBio.git
cd LinkInBio

# Start all services
docker-compose up --build
```

That's it! Visit `http://localhost` in your browser.

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## Running Locally without Docker

**Prerequisites** — Python 3.12, Node.js 20, PostgreSQL, Redis

**Backend**
```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your DATABASE_URL and SECRET_KEY

uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## API Overview

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create account | ❌ |
| POST | `/auth/login` | Login, get JWT | ❌ |
| GET | `/profile/me` | Get my profile | ✅ |
| PUT | `/profile/me` | Update profile | ✅ |
| GET | `/{username}` | Public profile + links | ❌ |
| GET | `/links` | Get my links | ✅ |
| POST | `/links` | Add a link | ✅ |
| PUT | `/links/{id}` | Edit a link | ✅ |
| DELETE | `/links/{id}` | Delete a link | ✅ |
| PUT | `/links/reorder` | Reorder links | ✅ |
| GET | `/click/{link_id}` | Track click + redirect | ❌ |
| GET | `/analytics` | Get click analytics | ✅ |

---

## Project Structure

```
LinkInBio/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings from .env
│   ├── db/
│   │   ├── session.py       # SQLAlchemy engine + session
│   │   └── redis.py         # Redis connection
│   ├── models/
│   │   ├── user.py          # User + Profile tables
│   │   ├── link.py          # Link table
│   │   └── click.py         # ClickEvent table
│   ├── routers/
│   │   ├── auth.py          # Register + login
│   │   ├── profile.py       # Profile CRUD + public page
│   │   ├── links.py         # Links CRUD + reorder
│   │   └── analytics.py     # Click tracking + stats
│   └── utils/
│       └── auth.py          # JWT + bcrypt helpers
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx    # Manage links
│       │   ├── Analytics.jsx    # Click stats
│       │   └── PublicPage.jsx   # Public profile
│       ├── api/axios.js         # Axios instance + interceptor
│       ├── store/authStore.js   # Zustand auth state
│       └── components/
│           └── ProtectedRoute.jsx
├── docker-compose.yml
└── README.md
```