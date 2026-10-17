"""Feature tests: audio quality mapping, archives, playlist jobs (no network).

Playlist children use invalid URLs so their worker threads fail fast without
touching the network; the parent aggregates purely off job state.
"""

import time

from fastapi.testclient import TestClient

from app import ytdlp_service as yt
from app.config import load_settings
from app.downloads_manager import manager
from app.main import app

client = TestClient(app)


def test_parse_audio_quality():
    s = load_settings()
    s.audio_quality = "320"
    assert yt.parse_audio_quality("audio", s) == "320"
    assert yt.parse_audio_quality("audio:192", s) == "192"
    assert yt.parse_audio_quality("audio:999", s) == "320"
    assert yt.parse_audio_quality("137", s) is None
    assert yt.parse_audio_quality("best", s) is None


def test_archive_helpers():
    assert yt.archived_ids("no-such-playlist-xyz") == set()
    p = yt.archive_path("PL abc/def?!")
    assert p.name == "PLabcdef.txt"
    assert ".." not in str(p)


def test_settings_new_fields_roundtrip():
    r = client.put("/api/settings", json={
        "audio_quality": "192", "default_to_audio": True,
        "subtitle_mode": "file", "subtitle_lang": "fr",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["audio_quality"] == "192"
    assert body["default_to_audio"] is True
    assert body["subtitle_mode"] == "file"
    assert body["subtitle_lang"] == "fr"
    client.put("/api/settings", json={
        "audio_quality": "320", "default_to_audio": False, "subtitle_mode": "embed",
    })


def test_start_playlist_rejects_empty():
    r = client.post("/api/downloads/start-playlist", json={
        "url": "https://www.youtube.com/playlist?list=PLx",
        "title": "P", "entries": [],
    })
    assert r.status_code == 422


def test_playlist_parent_children_flow():
    entries = [
        {"id": "e1", "title": "Ep 1", "url": "not-a-url-1"},
        {"id": "e2", "title": "Ep 2", "url": "not-a-url-2"},
    ]
    parent = manager.submit_playlist(
        "https://www.youtube.com/playlist?list=PLx", "best", "Test List",
        "YouTube", "", entries, "lan", playlist_id="PLx",
    )
    assert parent.is_parent and len(parent.children) == 2
    deadline = time.time() + 30
    while time.time() < deadline:
        state = manager.get(parent.job_id)
        assert state is not None
        if state.status in {"finished", "error", "cancelled"}:
            break
        time.sleep(0.5)
    state = manager.get(parent.job_id)
    assert state is not None and state.status in {"finished", "error", "cancelled"}
    assert state.to_dict()["children_total"] == 2
    # children recorded with the parent link
    from app.db import SessionLocal
    from app.models import DownloadRecord

    session = SessionLocal()
    try:
        kids = session.query(DownloadRecord).filter_by(parent_job_id=parent.job_id).all()
        assert len(kids) == 2
    finally:
        session.close()
    # cancel is a safe no-op on terminal jobs
    assert manager.cancel(parent.job_id) is False
