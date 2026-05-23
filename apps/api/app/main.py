from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
import os

from app.core.config import settings
from app.db.session import engine, async_session_factory
from app.db.base import Base
from app.models.user import User, UserRole
from app.core.security import hash_password

# Import all models so Base.metadata knows about them
from app.models import User, Category, Question, UserProgress, Bookmark, QuizSession

# Import routers
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.categories import router as categories_router
from app.api.v1.questions import router as questions_router
from app.api.v1.quiz import router as quiz_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.student import router as student_router
from app.api.v1.universities import router as universities_router
from app.api.v1.notes import router as notes_router
from app.api.v1.bookmarks import router as bookmarks_router

async def seed_super_admin():
    """Create the Super Admin account if it doesn't exist."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == settings.SUPER_ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()
        if admin is None:
            admin = User(
                email=settings.SUPER_ADMIN_EMAIL,
                hashed_password=hash_password(settings.SUPER_ADMIN_PASSWORD),
                full_name="Super Admin",
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            print(f"[SEED] Super Admin created: {settings.SUPER_ADMIN_EMAIL}")
        else:
            print(f"[SEED] Super Admin already exists: {settings.SUPER_ADMIN_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup: create tables and seed admin
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_super_admin()
    print(f"[START] {settings.APP_NAME} is running!")
    yield
    # Shutdown
    await engine.dispose()
    print(f"[STOP] {settings.APP_NAME} shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Professional-grade Medical Question Bank API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register API routers
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(categories_router, prefix=API_PREFIX)
app.include_router(questions_router, prefix=API_PREFIX)
app.include_router(quiz_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(student_router, prefix=API_PREFIX)
app.include_router(universities_router, prefix=API_PREFIX)
app.include_router(notes_router, prefix=API_PREFIX)
app.include_router(bookmarks_router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
