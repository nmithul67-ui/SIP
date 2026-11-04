"""
backend/database.py
─────────────────────────────────────────────────────────────────────────────
Async SQLAlchemy engine & session factory for production database management.
Supports both PostgreSQL (asyncpg) and SQLite (aiosqlite).
"""

import os
from pathlib import Path
from typing import AsyncGenerator
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# Load database URL from environment or default to SQLite local file
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./finos.db")

# Create Async Engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True if "sqlite" not in DATABASE_URL else False,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency for yielding Async DB sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Create all tables in the database if they do not exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
