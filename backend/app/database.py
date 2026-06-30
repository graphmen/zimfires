import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Supabase PostgreSQL URL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres" # Default dev URL
)

# Async engine for efficient I/O, PgBouncer compatibility requires statement_cache_size=0
engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"statement_cache_size": 0})

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    expire_on_commit=False, 
    autocommit=False, 
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
