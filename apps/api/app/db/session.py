from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings

# Build engine kwargs based on database type
connect_args = {}
engine_kwargs = {
    "echo": settings.DEBUG,
}

if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite needs check_same_thread=False for async and uses StaticPool
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args
else:
    # PostgreSQL and other production databases support connection pooling
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_pre_ping"] = True

# Async engine
engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

# Async session factory
async_session_factory = async_sessionmaker(
    engine,
    expire_on_commit=False,
)
