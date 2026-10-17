"""SQLite setup (SQLAlchemy 2.0, local file, same-thread-safe for dev server)."""

from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DB_PATH


class Base(DeclarativeBase):
    pass


engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    from . import models  # noqa: F401  (register tables)

    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate() -> None:
    """Lightweight additive migrations for the local history.db.

    create_all() never adds columns to an existing table, so new fields are
    ALTERed in here with backfills. Keep entries additive + idempotent.
    """
    with engine.connect() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(downloads)"))}
        if "origin" not in cols:
            conn.execute(text("ALTER TABLE downloads ADD COLUMN origin VARCHAR(16) DEFAULT 'lan'"))
            conn.execute(text("UPDATE downloads SET origin='lan' WHERE origin IS NULL"))
        if "transferred" not in cols:
            conn.execute(text("ALTER TABLE downloads ADD COLUMN transferred INTEGER DEFAULT 0"))
            conn.execute(text("UPDATE downloads SET transferred=0 WHERE transferred IS NULL"))
        if "parent_job_id" not in cols:
            conn.execute(text("ALTER TABLE downloads ADD COLUMN parent_job_id VARCHAR(64) DEFAULT ''"))
            conn.execute(text("UPDATE downloads SET parent_job_id='' WHERE parent_job_id IS NULL"))
        if "root_dir" not in cols:
            conn.execute(text("ALTER TABLE downloads ADD COLUMN root_dir TEXT DEFAULT ''"))
            conn.execute(text("UPDATE downloads SET root_dir='' WHERE root_dir IS NULL"))
        conn.commit()


def get_session():
    """FastAPI dependency yielding a DB session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
