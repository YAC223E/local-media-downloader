"""Download job manager: in-memory live state + threaded yt-dlp runs + history writes.

Design: FastAPI BackgroundTasks are not enough here (we need progress + cancel +
a concurrency cap), so jobs run in plain worker threads guarded by a semaphore.
Room to upgrade to ARQ later: this module is the only place that spawns work.
"""

from __future__ import annotations

import glob
import logging
import re
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from . import ytdlp_service as yt
from .config import LOCAL_FOLDER, AppSettings, load_settings
from .db import SessionLocal, init_db
from .models import DownloadRecord

log = logging.getLogger("lmd.jobs")

STATUSES = ("queued", "extracting", "downloading", "merging", "finished", "error", "cancelled")

#: Playable outputs the resolver may claim; sidecars (.srt/.jpg/.json) never.
MEDIA_SUFFIXES = {
    ".mp4", ".mkv", ".webm", ".mov", ".m4v", ".avi",
    ".m4a", ".mp3", ".aac", ".opus", ".ogg", ".oga", ".flac", ".wav",
}


class Job:
    """Live mutable state for one download (SSE reads this; never persisted directly)."""

    def __init__(self, job_id: str, url: str, format_id: str, title: str, platform: str, thumbnail: str,
                 origin: str = "lan", parent_job_id: str = "", media_opts: dict[str, Any] | None = None,
                 is_parent: bool = False, subfolder: str = "", needs_audio: bool = False):
        self.job_id = job_id
        self.url = url
        self.format_id = format_id
        self.title = title or url
        self.platform = platform or "Other"
        self.thumbnail = thumbnail or ""
        self.origin = origin if origin in {"laptop", "lan"} else "lan"
        self.parent_job_id = parent_job_id
        self.media_opts = media_opts or {}
        self.is_parent = is_parent
        self.needs_audio = needs_audio
        # Shelf subfolder below <Platform>/ (playlist title). Sanitized at use.
        self.subfolder = subfolder
        self.children: list[str] = []  # child job_ids (parent jobs only)
        self._children_done = 0
        self.status = "queued"
        self.progress = 0.0
        self.downloaded_bytes = 0
        self.total_bytes: int | None = None
        self.speed: float | None = None
        self.eta: int | None = None
        self.filename = ""
        self.error = ""
        self.format_label = ""
        self.current_title = ""  # parent: title of the child currently working
        self.filepath = ""  # exact final path reported by yt-dlp after post-processing
        self.started_at = 0.0  # when the worker actually began (slot acquired)
        self.transferred = False  # LAN pull completed; server copy removed
        self._cancel = threading.Event()
        self.updated = time.time()

    def touch(self) -> None:
        self.updated = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id, "status": self.status, "progress": round(self.progress, 4),
            "downloaded_bytes": self.downloaded_bytes, "total_bytes": self.total_bytes,
            "speed": self.speed, "eta": self.eta, "filename": self.filename, "error": self.error,
            "children_total": len(self.children),
            "children_done": self._children_done,
            "current_title": self.current_title,
            "is_parent": self.is_parent,
            "transferred": self.transferred,
        }


class Manager:
    # Live jobs are evicted this long after reaching a terminal state, and
    # the table is capped — otherwise a long-running server leaks memory.
    JOB_TTL = 3600.0
    JOB_CAP = 300

    def __init__(self) -> None:
        init_db()
        self.jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._slots = threading.Semaphore(load_settings().concurrent_limit)

    # -- public API -----------------------------------------------------
    def submit(self, url: str, format_id: str, title: str, platform: str, thumbnail: str, origin: str = "lan",
               media_opts: dict[str, Any] | None = None, parent_job_id: str = "", subfolder: str = "",
               needs_audio: bool = False) -> Job:
        job = Job(uuid.uuid4().hex[:12], url, format_id, title, platform, thumbnail, origin,
                  parent_job_id=parent_job_id, media_opts=media_opts, subfolder=subfolder,
                  needs_audio=needs_audio)
        with self._lock:
            self.jobs[job.job_id] = job
        self._evict()
        self._record_create(job)
        self._spawn(job.job_id)
        return job

    def submit_playlist(self, url: str, format_id: str, title: str, platform: str, thumbnail: str,
                        entries: list[dict[str, Any]], origin: str = "lan",
                        media_opts: dict[str, Any] | None = None, playlist_id: str = "") -> Job:
        """One parent job + one child job per not-yet-grabbed entry.

        Children flow through the normal semaphore slots; the parent holds no
        slot (it only waits), so a big playlist can never deadlock the pool.
        """
        from . import ytdlp_service as _yt

        parent = Job(uuid.uuid4().hex[:12], url, format_id, title, platform, thumbnail, origin,
                     media_opts=media_opts, is_parent=True, subfolder="")
        parent.format_label = f"playlist:{len(entries)}"
        with self._lock:
            self.jobs[parent.job_id] = parent
        self._record_create(parent)
        archive = str(_yt.archive_path(playlist_id or parent.job_id))
        Path(archive).parent.mkdir(parents=True, exist_ok=True)
        safe_folder = "".join(c for c in title if c.isalnum() or c in ("-", "_", " ")).strip() or "Playlist"
        for entry in entries:
            child_media = dict(media_opts or {})
            child_media["download_archive"] = archive
            child = Job(uuid.uuid4().hex[:12], entry.get("url") or url, format_id,
                        entry.get("title") or "Untitled", platform, entry.get("thumbnail") or "",
                        origin, parent_job_id=parent.job_id, media_opts=child_media,
                        subfolder=safe_folder)
            with self._lock:
                self.jobs[child.job_id] = child
                parent.children.append(child.job_id)
            self._record_create(child)
            self._spawn(child.job_id)
        parent.status = "downloading"
        self._record_update(parent)
        self._spawn(parent.job_id)
        return parent

    def _spawn(self, job_id: str) -> None:
        thread = threading.Thread(target=self._run, args=(job_id,), daemon=True)
        thread.start()

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            job = self.jobs.get(job_id)
        if job is None:
            self._evict()
        return job

    def list_jobs(self) -> list[dict[str, Any]]:
        """Live jobs for the Downloads tab: active first, newest first."""
        with self._lock:
            jobs = list(self.jobs.values())
        order = {"queued": 0, "extracting": 1, "downloading": 2, "merging": 3,
                 "error": 4, "cancelled": 5, "finished": 6}
        jobs.sort(key=lambda j: (order.get(j.status, 9), -j.updated))
        return [{**j.to_dict(), "title": j.title, "platform": j.platform,
                 "thumbnail": j.thumbnail, "origin": j.origin,
                 "is_parent": j.is_parent} for j in jobs[:100]]

    def _evict(self) -> None:
        """Drop old terminal jobs so the table can't grow without bound."""
        now = time.time()
        with self._lock:
            stale = [jid for jid, j in self.jobs.items()
                     if j.status in {"finished", "error", "cancelled"}
                     and now - j.updated > self.JOB_TTL]
            for jid in stale:
                del self.jobs[jid]
            if len(self.jobs) > self.JOB_CAP:
                terminal = sorted(
                    (jid for jid, j in self.jobs.items()
                     if j.status in {"finished", "error", "cancelled"}),
                    key=lambda jid: self.jobs[jid].updated,
                )
                for jid in terminal[:len(self.jobs) - self.JOB_CAP]:
                    del self.jobs[jid]

    def mark_transferred(self, job_id: str) -> None:
        """A LAN pull finished; reflect it in live job state immediately."""
        job = self.get(job_id)
        if job:
            job.transferred = True
            job.filepath = ""
            job.touch()

    def cancel(self, job_id: str) -> bool:
        job = self.get(job_id)
        if not job or job.status in {"finished", "error", "cancelled"}:
            return False
        job._cancel.set()
        # Cancelling a playlist stops every still-running episode too.
        for child_id in list(job.children):
            child = self.get(child_id)
            if child and child.status not in {"finished", "error", "cancelled"}:
                child._cancel.set()
        return True

    def refresh_limit(self) -> None:
        """Rebuild the semaphore after settings change (simple + correct for local use)."""
        limit = max(1, min(8, load_settings().concurrent_limit))
        self._slots = threading.Semaphore(limit)

    # -- internals ------------------------------------------------------
    def _run(self, job_id: str) -> None:
        job = self.get(job_id)
        if not job:
            return
        if job.is_parent:
            self._run_parent(job)
            return
        # Capture the slot object: if Settings rebuilds the semaphore mid-run,
        # releasing into the NEW semaphore would silently inflate its permits.
        slot = self._slots
        if not slot.acquire(blocking=False):
            job.error = "Concurrent limit reached — try again when a download finishes."
            self._finish(job, "error")
            return
        job.started_at = time.time()
        try:
            settings = load_settings()
            safe_platform = "".join(c for c in job.platform if c.isalnum() or c in ("-", "_", " ")).strip() or "Other"
            # Laptop orders file into "This Laptop/<Platform>/[subfolder]"; LAN
            # devices file into "<Platform>/[subfolder]" (their copy leaves after).
            if job.origin == "laptop":
                target_dir = Path(settings.download_dir) / LOCAL_FOLDER / safe_platform
            else:
                target_dir = Path(settings.download_dir) / safe_platform
            if job.subfolder:
                safe_sub = "".join(c for c in job.subfolder if c.isalnum() or c in ("-", "_", " ")).strip()
                if safe_sub:
                    target_dir = target_dir / safe_sub
            target_dir.mkdir(parents=True, exist_ok=True)
            outtmpl = str(target_dir / "%(title)s [%(id)s].%(ext)s")

            def on_progress(d: dict[str, Any]) -> None:
                total = d.get("total_bytes")
                done = int(d.get("downloaded_bytes") or 0)
                job.downloaded_bytes = done
                job.total_bytes = total
                job.speed = d.get("speed")
                job.eta = d.get("eta")
                if d.get("filename"):
                    job.filename = Path(str(d["filename"])).name
                if total:
                    job.progress = max(0.0, min(1.0, done / total))
                elif job.status != "merging":
                    job.status = "downloading"
                job.touch()

            def on_status(s: str) -> None:
                job.status = s
                job.touch()
                self._record_update(job)

            job.status = "extracting"
            self._record_update(job)
            self._download_with_retry(job, settings, outtmpl, on_progress, on_status)
            if job._cancel.is_set():
                self._finish(job, "cancelled")
            else:
                job.progress = 1.0
                self._finish(job, "finished")
        except Exception as exc:  # noqa: BLE001 — surfaced to UI + history
            if "Cancelled by user" in str(exc) or job._cancel.is_set():
                self._finish(job, "cancelled")
            else:
                job.error = str(exc)[:500]
                log.exception("job %s failed: %s", job.job_id, job.error)
                self._finish(job, "error")
        finally:
            slot.release()

    def _run_parent(self, job: Job) -> None:
        """Wait for the playlist's children; aggregate progress. Holds no slot."""
        try:
            while True:
                if job._cancel.is_set():
                    self._finish(job, "cancelled")
                    return
                with self._lock:
                    kids = [self.jobs[c] for c in job.children if c in self.jobs]
                if not kids:
                    job.error = "Playlist had nothing new to grab."
                    self._finish(job, "error")
                    return
                done = [k for k in kids if k.status in {"finished", "error", "cancelled"}]
                active = next((k for k in kids if k.status in {"extracting", "downloading", "merging"}), None)
                job._children_done = len(done)
                job.progress = len(done) / len(kids)
                job.current_title = active.title if active else ""
                if active:
                    job.speed, job.eta = active.speed, active.eta
                job.touch()
                if len(done) == len(kids):
                    if all(k.status == "cancelled" for k in kids):
                        self._finish(job, "cancelled")
                    elif any(k.status == "finished" for k in kids):
                        job.progress = 1.0
                        self._finish(job, "finished")
                    else:
                        job.error = "Every episode failed — open one to see why."
                        self._finish(job, "error")
                    return
                time.sleep(1.0)
        except Exception as exc:  # noqa: BLE001
            job.error = str(exc)[:500]
            log.exception("parent job %s failed: %s", job.job_id, job.error)
            self._finish(job, "error")

    def _download_with_retry(self, job: Job, settings: AppSettings, outtmpl: str,
                               on_progress, on_status) -> None:
        """Run yt-dlp, retrying once for the two transient failures we see:

        1. "Requested format is not available" — YouTube rotates/withdraws
           formats between probe and download. Retry with best automatically.
        2. WinError 32 file locks — antivirus/indexer briefly holding the
           temp file during the merge step. Wait 5s and retry once.
        """
        fmt = job.format_id
        for attempt in (1, 2):
            try:
                result = yt.download(
                    job.url, fmt, settings, outtmpl,
                    on_progress=on_progress, on_status=on_status,
                    should_cancel=job._cancel.is_set,
                    media_opts=job.media_opts,
                    needs_audio=job.needs_audio,
                )
                if isinstance(result, dict):
                    job.filepath = str(result.get("filepath") or "")
                return
            except Exception as exc:  # noqa: BLE001 — classified below
                msg = str(exc)
                transient = (
                    "Requested format is not available" in msg
                    or "WinError 32" in msg
                    or "being used by another process" in msg
                )
                if attempt == 1 and transient and not job._cancel.is_set():
                    if "Requested format is not available" in msg:
                        fmt = "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
                        job.error = ""
                        log.info("job %s: picked quality expired, retrying with best", job.job_id)
                    else:
                        log.info("job %s: file locked, waiting 5s before retry", job.job_id)
                        job._cancel.wait(5.0)
                        if job._cancel.is_set():
                            raise
                    job.status = "extracting"
                    job.touch()
                    self._record_update(job)
                    continue
                raise

    # -- persistence ----------------------------------------------------
    def _record_create(self, job: Job) -> None:
        session = SessionLocal()
        try:
            session.add(DownloadRecord(
                job_id=job.job_id, url=job.url, title=job.title, platform=job.platform,
                thumbnail=job.thumbnail, format_label=job.format_label or job.format_id, status="queued",
                origin=job.origin, parent_job_id=job.parent_job_id,
            ))
            session.commit()
        finally:
            session.close()

    def _record_update(self, job: Job) -> None:
        session = SessionLocal()
        try:
            rec = session.query(DownloadRecord).filter_by(job_id=job.job_id).first()
            if rec:
                rec.status = "active" if job.status not in {"finished", "error", "cancelled"} else job.status
                rec.title = job.title
            session.commit()
        finally:
            session.close()

    def _finish(self, job: Job, status: str) -> None:
        job.status = status
        job.touch()
        session = SessionLocal()
        try:
            rec = session.query(DownloadRecord).filter_by(job_id=job.job_id).first()
            if rec:
                rec.status = status
                rec.error = job.error
                rec.finished_at = datetime.utcnow()
                if not job.is_parent:
                    # Prefer the exact path yt-dlp reported after merge/move;
                    # fall back to matching the progress filename (legacy/odd
                    # extractors) and, last, the newest media file.
                    found = self._reported_file(job)
                    if found is None:
                        found = self._locate_file(job)
                    if found:
                        base = Path(load_settings().download_dir).resolve()
                        try:
                            rec.file_path = str(found.relative_to(base))
                        except ValueError:
                            rec.file_path = str(found)
                        rec.root_dir = str(base)
                        size = found.stat().st_size if found.exists() else 0
                        rec.file_size = size
                        # The final yt-dlp progress frame reports zeroed counters; report
                        # the real, landed file so finished readouts show actual bytes.
                        if status == "finished" and size:
                            job.downloaded_bytes = size
                            job.total_bytes = size
                            job.speed = None
                            job.eta = None
                    elif status == "finished":
                        job.speed = None
                        job.eta = None
            session.commit()
        finally:
            session.close()

    def _reported_file(self, job: Job) -> Path | None:
        """The exact file yt-dlp reported after post-processing, if it exists."""
        if not job.filepath:
            return None
        candidate = Path(job.filepath)
        if not candidate.is_absolute():
            candidate = Path(load_settings().download_dir) / candidate
        try:
            candidate = candidate.resolve()
        except OSError:
            return None
        return candidate if candidate.is_file() else None

    def _locate_file(self, job: Job) -> Path | None:
        settings: AppSettings = load_settings()
        base = Path(settings.download_dir)
        # Mirror the origin-aware layout from _run.
        safe_platform = "".join(c for c in job.platform if c.isalnum() or c in ("-", "_", " ")).strip() or "Other"
        if job.origin == "laptop":
            search_dir = base / LOCAL_FOLDER / safe_platform
        else:
            search_dir = base / safe_platform
        if job.subfolder:
            safe_sub = "".join(c for c in job.subfolder if c.isalnum() or c in ("-", "_", " ")).strip()
            if safe_sub:
                search_dir = search_dir / safe_sub
        if job.filename:
            direct = search_dir / Path(job.filename).name
            if direct.exists():
                return direct
            # Streams land as `Title [id].f308.webm` or, on Instagram,
            # `Title [id].fdash-123.m4a`; the merge renames to
            # `Title [id].mp4`. Strip any `.f<format-id>` suffix — not just
            # numeric ids — then match the base. glob.escape: titles contain
            # "[id]" and would otherwise be treated as glob character classes.
            stem = Path(job.filename).stem
            for candidate in (stem, re.sub(r"\.f[^.]+$", "", stem)):
                if not candidate:
                    continue
                if search_dir.exists():
                    # Newest first: mid-merge can leave .part shells around.
                    matches = sorted(search_dir.glob(f"{glob.escape(candidate)}.*"),
                                     key=lambda p: p.stat().st_mtime, reverse=True)
                    final = [m for m in matches if not m.name.endswith(".part")]
                    if final:
                        return final[0]
        # Last resort: yt-dlp gave no usable filename. Take the newest playable
        # file written since this worker started, so a completed download can
        # never become unsaveable (which surfaced as a JSON "file" in browsers).
        if search_dir.is_dir():
            cutoff = max(0.0, float(getattr(job, "started_at", 0.0) or 0.0) - 2.0)
            recent = [
                p for p in search_dir.iterdir()
                if p.is_file()
                and p.suffix.lower() in MEDIA_SUFFIXES
                and p.stat().st_mtime >= cutoff
            ]
            if recent:
                return max(recent, key=lambda p: p.stat().st_mtime)
        return None


manager = Manager()
