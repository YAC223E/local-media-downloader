"""Retry tests: expired formats fall back to best, file locks wait + retry."""

import pytest

from app import downloads_manager as dm
from app.config import load_settings

class _CancelStub:
    def __init__(self, cancelled=False):
        self._c = cancelled
        self.waited = []

    def is_set(self):
        return self._c

    def set(self):
        self._c = True

    def wait(self, secs):
        self.waited.append(secs)
        return self._c


def _job(**kw):
    base = dict(job_id="t1", url="https://example.com/v", format_id="137",
                title="T", platform="YouTube", thumbnail="")
    base.update(kw)
    job = dm.Job(**base)
    job._cancel = _CancelStub()
    return job


def test_expired_format_retries_with_best(monkeypatch):
    calls = []

    def fake_download(url, format_id, *a, **k):
        calls.append(format_id)
        if len(calls) == 1:
            raise RuntimeError("ERROR: Requested format is not available")
        return {"ok": True}

    monkeypatch.setattr(dm.yt, "download", fake_download)
    job = _job()
    dm.manager._download_with_retry(job, load_settings(), "out", lambda d: None, lambda s: None)
    assert calls == ["137", "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"]


def test_file_lock_waits_and_retries(monkeypatch):
    calls = []

    def fake_download(url, format_id, *a, **k):
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("[WinError 32] The process cannot access the file because it is being used by another process")
        return {"ok": True}

    monkeypatch.setattr(dm.yt, "download", fake_download)
    job = _job()
    dm.manager._download_with_retry(job, load_settings(), "out", lambda d: None, lambda s: None)
    assert len(calls) == 2
    assert job._cancel.waited == [5.0]


def test_permanent_error_raises_immediately(monkeypatch):
    calls = []

    def fake_download(url, format_id, *a, **k):
        calls.append(1)
        raise RuntimeError("ERROR: Unsupported URL")

    monkeypatch.setattr(dm.yt, "download", fake_download)
    job = _job()
    with pytest.raises(RuntimeError):
        dm.manager._download_with_retry(job, load_settings(), "out", lambda d: None, lambda s: None)
    assert len(calls) == 1


def test_no_retry_when_cancelled(monkeypatch):
    calls = []

    def fake_download(url, format_id, *a, **k):
        calls.append(1)
        raise RuntimeError("[WinError 32] locked")

    monkeypatch.setattr(dm.yt, "download", fake_download)
    job = _job()
    job._cancel = _CancelStub(cancelled=True)
    with pytest.raises(RuntimeError):
        dm.manager._download_with_retry(job, load_settings(), "out", lambda d: None, lambda s: None)
    assert len(calls) == 1


def test_format_mapping_needs_audio(monkeypatch):
    """Video-only picks must request best audio merge or files come out silent."""
    from app import ytdlp_service as yt

    seen = {}

    class FakeYDL:
        def __init__(self, opts):
            seen.update(opts)

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def download(self, urls):
            pass

        def extract_info(self, url, download=True):
            return {"requested_downloads": []}

    monkeypatch.setattr(yt.yt_dlp, "YoutubeDL", FakeYDL)
    s = load_settings()
    noop = lambda *a, **k: None  # noqa: E731
    yt.download("https://example.com/v", "137", s, "out.%(ext)s",
                noop, noop, noop, needs_audio=True)
    assert seen["format"] == "137+bestaudio[ext=m4a]/bestaudio/bestvideo+bestaudio/best", seen["format"]
    yt.download("https://example.com/v", "best", s, "out.%(ext)s",
                noop, noop, noop)
    assert seen["format"] == "bestvideo+bestaudio[ext=m4a]/bestaudio/bestvideo+bestaudio/best", seen["format"]
    yt.download("https://example.com/v", "18", s, "out.%(ext)s",
                noop, noop, noop, needs_audio=False)
    assert seen["format"] == "18", seen["format"]
    yt.download("https://example.com/v", "audio:192", s, "out.%(ext)s",
                noop, noop, noop)
    assert seen["format"] == "bestaudio/best"
    assert {"key": "FFmpegExtractAudio", "preferredcodec": "mp3",
            "preferredquality": "192"} in seen["postprocessors"]
