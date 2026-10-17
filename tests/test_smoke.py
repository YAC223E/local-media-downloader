"""Smoke tests: health, validation, and system status (no network downloads)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    assert client.get("/api/health").json() == {"ok": True}


def test_bad_url_rejected():
    r = client.post("/api/fetch", json={"url": "not-a-url"})
    assert r.status_code == 422


def test_unknown_job_404():
    assert client.get("/api/downloads/doesnotexist").status_code == 404


def test_system_status_shape():
    body = client.get("/api/system").json()
    assert body["ok"] is True
    assert "ffmpeg" in body and "lan_ips" in body


def test_history_list():
    r = client.get("/api/history")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_downloads_list_shape():
    r = client.get("/api/downloads")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    for item in r.json():
        assert {"job_id", "status", "title", "platform"} <= set(item)


def test_origin_detection():
    from app.config import is_loopback

    assert is_loopback("127.0.0.1") is True
    assert is_loopback("::1") is True
    assert is_loopback("localhost") is True
    assert is_loopback("192.168.1.24") is False
    assert is_loopback(None) is False


def test_migrated_columns_exist():
    from sqlalchemy import text

    from app.db import engine

    with engine.connect() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(downloads)"))}
    assert {"origin", "transferred"} <= cols


def test_auto_delete_setting_roundtrip():
    before = client.get("/api/settings").json()["auto_delete_after_serve"]
    r = client.put("/api/settings", json={"auto_delete_after_serve": not before})
    assert r.status_code == 200
    assert r.json()["auto_delete_after_serve"] is (not before)
    # restore
    client.put("/api/settings", json={"auto_delete_after_serve": before})


def test_transferred_file_reports_gone():
    from app.db import SessionLocal
    from app.models import DownloadRecord

    session = SessionLocal()
    try:
        session.add(DownloadRecord(
            job_id="smoke410", url="https://example.com/v", title="gone",
            platform="Other", status="finished", file_path="", transferred=1,
        ))
        session.commit()
    finally:
        session.close()
    try:
        r = client.get("/api/downloads/smoke410/file")
        assert r.status_code == 410
    finally:
        session = SessionLocal()
        try:
            rec = session.query(DownloadRecord).filter_by(job_id="smoke410").first()
            if rec:
                session.delete(rec)
                session.commit()
        finally:
            session.close()
