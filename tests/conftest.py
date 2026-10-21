"""Test isolation: the suite must never write to the live history.db."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base


@pytest.fixture(autouse=True)
def isolated_history_db(tmp_path, monkeypatch):
    """Point every DB user at a throwaway SQLite file for each test."""
    engine = create_engine(
        f"sqlite:///{tmp_path / 'history.db'}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    monkeypatch.setattr("app.db.engine", engine)
    monkeypatch.setattr("app.db.SessionLocal", Session)
    # downloads_manager imported SessionLocal by name at module load.
    monkeypatch.setattr("app.downloads_manager.SessionLocal", Session)
    yield
    engine.dispose()
