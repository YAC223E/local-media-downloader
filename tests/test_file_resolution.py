"""Finished-file resolution: the recorded path must be the real landed file.

Regression guard for Instagram (and any site whose yt-dlp format id is not a
plain number): temp names look like ``Title [id].fdash-123.m4a`` while the
merged file is ``Title [id].mp4``. The old resolver only stripped ``.f123``,
so finished jobs recorded no file path and "Save to this device" downloaded
the 404 JSON error instead of the media.
"""

from types import SimpleNamespace

from app import downloads_manager as dm
from app import ytdlp_service as yt
from app.config import AppSettings, LOCAL_FOLDER
from app.routes.downloads import _guess_path_for_record, _media_id_from_url


def test_final_filepath_prefers_requested_downloads():
    info = {
        "requested_downloads": [
            {"filepath": r"C:\shelf\Instagram\Video [DeSRPWbTqty].mp4"},
        ],
    }
    assert yt._final_filepath(info) == r"C:\shelf\Instagram\Video [DeSRPWbTqty].mp4"


def test_final_filepath_walks_playlist_entries():
    info = {
        "entries": [
            {"requested_downloads": [{"filepath": "C:/shelf/one.mp4"}]},
            {"requested_downloads": [{"filepath": "C:/shelf/two.mp4"}]},
        ],
    }
    assert yt._final_filepath(info) == "C:/shelf/one.mp4"


def test_locate_file_strips_non_numeric_format_suffix(tmp_path, monkeypatch):
    final = tmp_path / "Instagram" / "Video by frames.of.quran [DeSRPWbTqty].mp4"
    final.parent.mkdir(parents=True)
    final.write_bytes(b"video-bytes")

    monkeypatch.setattr(dm, "load_settings", lambda: AppSettings(download_dir=str(tmp_path)))
    job = SimpleNamespace(
        platform="Instagram",
        origin="lan",
        subfolder="",
        filename="Video by frames.of.quran [DeSRPWbTqty].fdash-2049007852420023a.m4a",
        started_at=0,
    )
    assert dm.Manager._locate_file(dm.manager, job) == final


def test_media_id_from_known_urls():
    assert _media_id_from_url("https://www.instagram.com/reel/DeSRPWbTqty/?xtok=x") == "DeSRPWbTqty"
    assert _media_id_from_url("https://x.com/user/status/2109576227417714963?s=20") == "2109576227417714963"
    assert _media_id_from_url("https://www.youtube.com/watch?v=jNQXAC9IVRw") == "jNQXAC9IVRw"
    assert _media_id_from_url("https://youtu.be/jNQXAC9IVRw") == "jNQXAC9IVRw"
    assert _media_id_from_url("https://example.com/no-id") == ""


def test_guess_path_for_record_matches_media_id(tmp_path):
    final = tmp_path / "Instagram" / "Renamed by platform [DeSRPWbTqty].mp4"
    final.parent.mkdir(parents=True)
    final.write_bytes(b"video")

    rec = SimpleNamespace(
        platform="Instagram", origin="lan",
        url="https://www.instagram.com/reel/DeSRPWbTqty/",
        title="Original upload title",
    )
    assert _guess_path_for_record(rec, tmp_path) == final


def test_guess_path_for_record_checks_laptop_folder(tmp_path):
    final = tmp_path / LOCAL_FOLDER / "YouTube" / "Clip [jNQXAC9IVRw].mp4"
    final.parent.mkdir(parents=True)
    final.write_bytes(b"video")

    rec = SimpleNamespace(
        platform="YouTube", origin="laptop",
        url="https://www.youtube.com/watch?v=jNQXAC9IVRw",
        title="Clip",
    )
    assert _guess_path_for_record(rec, tmp_path) == final


def test_mark_transferred_updates_live_job():
    job = dm.Job("live-transferred", "u", "best", "T", "YouTube", "")
    dm.manager.jobs[job.job_id] = job
    try:
        dm.manager.mark_transferred(job.job_id)
        assert job.transferred is True
        assert job.to_dict()["transferred"] is True
        assert job.filepath == ""
    finally:
        dm.manager.jobs.pop(job.job_id, None)


def test_file_check_does_not_transfer_or_delete(tmp_path):
    from fastapi.testclient import TestClient

    from app.db import SessionLocal
    from app.main import app
    from app.models import DownloadRecord

    final = tmp_path / "YouTube" / "Clip [abc].mp4"
    final.parent.mkdir(parents=True)
    final.write_bytes(b"video-bytes")

    session = SessionLocal()
    try:
        session.add(DownloadRecord(
            job_id="check-job", url="https://example.com/v", title="Clip",
            platform="YouTube", status="finished",
            file_path=r"YouTube\Clip [abc].mp4", file_size=11,
            root_dir=str(tmp_path),
        ))
        session.commit()
    finally:
        session.close()

    client = TestClient(app)  # non-loopback test client would normally auto-delete
    r = client.get("/api/downloads/check-job/file?check=1")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "filename": "Clip [abc].mp4", "size": 11}
    assert final.is_file()


def test_cleanup_marks_duplicate_rows_transferred(tmp_path):
    from app.db import SessionLocal
    from app.models import DownloadRecord
    from app.routes.downloads import _cleanup_after_transfer

    final = tmp_path / "Instagram" / "Video [DeSRPWbTqty].mp4"
    final.parent.mkdir(parents=True)
    final.write_bytes(b"video")

    session = SessionLocal()
    try:
        session.add_all([
            DownloadRecord(job_id="job-a", url="https://instagram.com/reel/x",
                           title="Video", platform="Instagram", status="finished",
                           file_path=r"Instagram\Video [DeSRPWbTqty].mp4",
                           root_dir=str(tmp_path)),
            DownloadRecord(job_id="job-b", url="https://instagram.com/reel/x",
                           title="Video", platform="Instagram", status="finished",
                           file_path=r"Instagram\Video [DeSRPWbTqty].mp4",
                           root_dir=str(tmp_path)),
        ])
        session.commit()
    finally:
        session.close()

    live = dm.Job("job-a", "https://instagram.com/reel/x", "best", "Video", "Instagram", "")
    live.transferred = False
    dm.manager.jobs["job-a"] = live
    try:
        _cleanup_after_transfer(final, "job-a")
        assert live.transferred is True
        assert live.to_dict()["transferred"] is True
    finally:
        dm.manager.jobs.pop("job-a", None)

    session = SessionLocal()
    try:
        rows = session.query(DownloadRecord).filter(
            DownloadRecord.job_id.in_(("job-a", "job-b"))).all()
        assert len(rows) == 2
        assert all(r.transferred == 1 and r.file_path == "" for r in rows)
    finally:
        session.close()
    assert not final.exists()


def test_locate_file_falls_back_to_newest_media_since_start(tmp_path, monkeypatch):
    platform_dir = tmp_path / "YouTube"
    platform_dir.mkdir(parents=True)
    old = platform_dir / "Old video [old].mp4"
    old.write_bytes(b"old")
    final = platform_dir / "Fresh video [new].mp4"
    final.write_bytes(b"new")
    final.touch()

    monkeypatch.setattr(dm, "load_settings", lambda: AppSettings(download_dir=str(tmp_path)))
    job = SimpleNamespace(
        platform="YouTube",
        origin="lan",
        subfolder="",
        filename="",  # no usable progress filename
        started_at=0,
    )
    assert dm.Manager._locate_file(dm.manager, job) == final
