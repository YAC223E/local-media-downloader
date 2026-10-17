"""Audit regressions: caches, semaphore capture, eviction, glob, root_dir."""

import time

from fastapi.testclient import TestClient

from app import config as cfgmod
from app.main import app

client = TestClient(app)


def test_settings_cache_tracks_saves():
    from app.config import load_settings, save_settings

    s = load_settings()
    s.concurrent_limit = 3
    save_settings(s)
    assert load_settings().concurrent_limit == 3
    s.concurrent_limit = 2
    save_settings(s)
    assert load_settings().concurrent_limit == 2


def test_ffmpeg_resolver_cached(monkeypatch):
    import app.config as cfg

    calls = []

    def counting():
        calls.append(1)
        return None

    monkeypatch.setattr(cfg, "_resolve_ffmpeg_uncached", counting)
    cfg.invalidate_ffmpeg_cache()
    assert cfg.resolve_ffmpeg() is None
    assert cfg.resolve_ffmpeg() is None
    assert len(calls) == 1  # second hit served from cache
    cfg.invalidate_ffmpeg_cache()
    assert cfg.resolve_ffmpeg() is None
    assert len(calls) == 2


def test_semaphore_refresh_does_not_inflate():
    from app.downloads_manager import manager

    old = manager._slots
    assert old.acquire(blocking=False)
    manager.refresh_limit()  # rebuilds semaphore while a permit is out
    new = manager._slots
    old.release()  # must return to the OLD semaphore, not inflate the new one
    drained = 0
    while new.acquire(blocking=False):
        drained += 1
    assert drained == 2  # exactly the limit, no leaked permit
    manager.refresh_limit()


def test_job_eviction():
    from app.downloads_manager import Job, manager

    before = len(manager.jobs)
    for i in range(5):
        job = Job(f"evict{i}", "https://example.com/v", "best", "T", "YouTube", "")
        job.status = "finished"
        job.updated = time.time() - 7200
        with manager._lock:
            manager.jobs[f"evict{i}"] = job
    manager._evict()
    assert all(not j.startswith("evict") for j in manager.jobs)
    assert len(manager.jobs) == before


def test_locate_file_with_brackets(tmp_path, monkeypatch):
    from pathlib import Path

    from app.config import load_settings
    from app.downloads_manager import Job, manager

    base = Path(load_settings().download_dir)
    target_dir = base / "YouTube"
    target_dir.mkdir(parents=True, exist_ok=True)
    real = target_dir / "Show [abc123].mp4"
    real.write_bytes(b"x")
    try:
        job = Job("g1", "https://example.com/v", "137", "Show", "YouTube", "")
        job.filename = "Show [abc123].webm"  # pre-merge name, post-merge ext
        found = manager._locate_file(job)
        assert found is not None and found.name == real.name
    finally:
        real.unlink(missing_ok=True)


def test_serve_survives_folder_change(tmp_path):
    from app.config import load_settings
    from app.db import SessionLocal
    from app.models import DownloadRecord

    settings = load_settings()
    shelf = tmp_path / "shelf-a"
    (shelf / "YouTube").mkdir(parents=True)
    f = shelf / "YouTube" / "clip.mp4"
    f.write_bytes(b"z" * 64)
    s = SessionLocal()
    s.add(DownloadRecord(job_id="roottest", url="https://example.com/v", title="c",
                         platform="YouTube", status="finished",
                         file_path="YouTube/clip.mp4", file_size=64,
                         root_dir=str(shelf)))
    s.commit()
    s.close()
    try:
        # Today's folder differs, but the record remembers its own root.
        assert settings.download_dir != str(shelf)
        r = client.get("/api/downloads/roottest/file")
        assert r.status_code == 200
        assert r.content == b"z" * 64
    finally:
        s = SessionLocal()
        rec = s.query(DownloadRecord).filter_by(job_id="roottest").first()
        if rec:
            s.delete(rec)
            s.commit()
        s.close()
