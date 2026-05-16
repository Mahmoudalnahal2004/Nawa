# 🩺 Nawa — Medical Question Bank

A professional-grade Q-Bank platform for medical students built with **FastAPI** + **Next.js** + **PostgreSQL**.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL)

### 1. Start the Database

```bash
docker-compose up -d
```

### 2. Start the Backend (FastAPI)

```bash
cd apps/api
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- Super Admin will be auto-created: `admin@nawa.com` / `Admin123!`

### 3. Start the Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nawa.com | Admin123! |

## Architecture

```
apps/
├── api/          # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/v1/     # Route handlers
│   │   ├── core/       # Config, security, dependencies
│   │   ├── db/         # Database engine & base
│   │   ├── models/     # SQLAlchemy ORM models
│   │   ├── schemas/    # Pydantic schemas
│   │   └── services/   # Business logic
│   └── uploads/        # Medical images (dev)
└── web/          # Next.js frontend (TypeScript)
    └── src/
        ├── app/
        │   ├── admin/      # Admin pages
        │   ├── student/    # Student pages
        │   └── login/      # Auth pages
        └── lib/            # API client, auth, utils
```

## API Endpoints

### Auth
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/register` — Register (student)
- `POST /api/v1/auth/refresh` — Refresh token
- `GET /api/v1/auth/me` — Current user

### Admin
- `GET/POST /api/v1/categories` — Category CRUD
- `GET/POST /api/v1/questions` — Question CRUD
- `POST /api/v1/questions/import` — Excel import
- `PATCH /api/v1/questions/{id}/publish` — Toggle publish
- `GET/PATCH /api/v1/users` — Student management

### Student
- `POST /api/v1/quiz/start` — Start quiz session
- `POST /api/v1/quiz/{id}/answer` — Submit answer
- `GET /api/v1/analytics/progress` — Overall progress
- `GET /api/v1/analytics/weak-points` — Weak points
