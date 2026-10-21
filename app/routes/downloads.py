"""Download lifecycle: start, poll, SSE stream, cancel, serve finished file."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask

from ..config import LOCAL_FOLDER, is_loopback, load_settings
from ..downloads_manager import MEDIA_SUFFIXES, manager
from ..schemas import JobInfo, JobStatus, StartDownloadRequest, StartPlaylistRequest
from ..ytdlp_service import validate_url

log = logging.getLogger("lmd.routes.downloads")
router = APIRouter(prefix="/api/downloads", tags=["downloads"])


@router.get("", response_model=list[JobInfo])
async def list_downloads() -> list[JobInfo]:
    """Live jobs for the Downloads tab (active first). History stays separate."""
    return [JobInfo(**d) for d in manager.list_jobs()]


def _media_opts(body: StartDownloadRequest | StartPlaylistRequest) -> dict[str, Any]:
    opts: dict[str, Any] = {}
    if body.audio_quality:
        opts["audio_quality"] = body.audio_quality
    if body.subtitle_mode:
        opts["subtitle_mode"] = body.subtitle_mode
    if body.subtitle_lang is not None:
        opts["subtitle_lang"] = body.subtitle_lang
    return opts


@router.post("/start", response_model=JobStatus)
async def start_download(body: StartDownloadRequest, request: Request) -> JobStatus:
    try:
        url = validate_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    origin = "laptop" if is_loopback(request.client.host if request.client else None) else "lan"
    job = manager.submit(url, body.format_id or "best", body.title, body.platform, body.thumbnail,
                         origin, media_opts=_media_opts(body), needs_audio=body.needs_audio)
    return JobStatus(**job.to_dict())


@router.post("/start-playlist", response_model=JobStatus)
async def start_playlist(body: StartPlaylistRequest, request: Request) -> JobStatus:
    """Download playlist episodes as individually tracked jobs under one parent."""
    try:
        url = validate_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    wanted = [e for e in body.entries if e.url]
    if body.entry_ids is not None:
        wanted = [e for e in wanted if e.id in set(body.entry_ids)]
    if not wanted:
        raise HTTPException(status_code=422, detail="Nothing new to grab — every episode is already saved.")
    origin = "laptop" if is_loopback(request.client.host if request.client else None) else "lan"
    job = manager.submit_playlist(url, body.format_id or "best", body.title, body.platform,
                                  body.thumbnail, [e.model_dump() for e in wanted],
                                  origin, media_opts=_media_opts(body),
                                  playlist_id=body.playlist_id)
    return JobStatus(**job.to_dict())


@router.get("/{job_id}", response_model=JobStatus)
async def job_status(job_id: str) -> JobStatus:
    job = manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown download id.")
    return JobStatus(**job.to_dict())


@router.get("/{job_id}/events")
async def job_events(job_id: str):
    """Server-Sent Events: live progress frames until a terminal state."""
    job = manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown download id.")

    async def stream():
        last = ""
        while True:
            current = manager.get(job_id)
            if not current:
                break
            payload = json.dumps(current.to_dict())
            if payload != last:
                yield f"data: {payload}\n\n"
                last = payload
            if current.status in {"finished", "error", "cancelled"}:
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/{job_id}/cancel", response_model=JobStatus)
async def cancel_download(job_id: str) -> JobStatus:
    job = manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown download id.")
    manager.cancel(job_id)
    return JobStatus(**job.to_dict())


_ID_PATTERNS = (
    r"[?&]v=([A-Za-z0-9_-]{6,})",                      # YouTube watch URLs
    r"youtu\.be/([A-Za-z0-9_-]{6,})",                  # YouTube short links
    r"/(?:status|statuses|video|videos|reel|reels|p|tv|shorts)/([A-Za-z0-9_-]{5,})",
)


def _media_id_from_url(url: str) -> str:
    """Best-effort media id used as the [id] suffix in yt-dlp filenames."""
    text = url or ""
    for pattern in _ID_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return ""


def _guess_path_for_record(rec: Any, base: Path) -> Path | None:
    """Find the media file for a finished history row that lost its path.

    Older/odd extractors could finish without recording `file_path`; the file
    itself is still on the shelf. Match the URL's media id first (robust),
    then the human title, always picking the newest playable file.
    """
    platform = "".join(c for c in (rec.platform or "Other") if c.isalnum() or c in ("-", "_", " ")).strip() or "Other"
    folders = [base / platform]
    if (rec.origin or "") == "laptop":
        folders.insert(0, base / LOCAL_FOLDER / platform)
    hint = _media_id_from_url(rec.url or "").lower()
    title = (rec.title or "").strip().lower()
    by_title: list[Path] = []
    for folder in folders:
        if not folder.is_dir():
            continue
        try:
            entries = list(folder.rglob("*"))
        except OSError:
            continue
        for path in entries:
            if not path.is_file() or path.suffix.lower() not in MEDIA_SUFFIXES:
                continue
            name = path.name.lower()
            if hint and f"[{hint}]" in name:
                return path
            if title and title in name:
                by_title.append(path)
    if by_title:
        return max(by_title, key=lambda p: p.stat().st_mtime)
    return None


@router.get("/{job_id}/file")
async def download_file(job_id: str, request: Request, check: bool = False):
    """Serve the finished file. Path is resolved server-side — no client paths accepted.

    When auto_delete_after_serve is on and the puller is a LAN device (not this
    laptop), the server copy is removed right after the transfer completes and
    the history row is marked transferred. Laptop pulls never delete.
    """
    from ..config import LEGACY_DOWNLOADS_DIR, load_settings
    from ..db import SessionLocal
    from ..models import DownloadRecord

    session = SessionLocal()
    try:
        rec = session.query(DownloadRecord).filter_by(job_id=job_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Unknown download id.")
        if not rec.file_path and rec.transferred:
            raise HTTPException(status_code=410, detail="Already saved to your device — the server copy was removed.")
        base = Path(load_settings().download_dir).resolve()
        if not rec.file_path and rec.status == "finished":
            # Self-heal rows written before the exact-path fix: the media is
            # on the shelf, so find it and persist the path instead of handing
            # the browser a 404 JSON body (which it saved as a bogus file).
            healed = _guess_path_for_record(rec, base)
            if healed:
                healed = healed.resolve()
                try:
                    rec.file_path = str(healed.relative_to(base))
                    rec.root_dir = str(base)
                except ValueError:
                    rec.file_path = str(healed)
                    rec.root_dir = ""
                try:
                    rec.file_size = healed.stat().st_size
                except OSError:
                    rec.file_size = 0
                session.commit()
        if not rec.file_path:
            raise HTTPException(status_code=404, detail="No file recorded for this download yet.")
        # Resolution order: the shelf root recorded at finish time (survives
        # Settings folder changes), today's folder, then the legacy location.
        candidates = [base]
        if rec.root_dir and Path(rec.root_dir).is_absolute():
            candidates.insert(0, Path(rec.root_dir).resolve())
        candidates.append(LEGACY_DOWNLOADS_DIR.resolve())
        target = None
        for root in candidates:
            probe = (root / rec.file_path).resolve()
            # Block path traversal: the resolved file must stay inside its root.
            if root not in probe.parents and probe != root:
                raise HTTPException(status_code=403, detail="Refused: file is outside the download folder.")
            if probe.is_file():
                target = probe
                break
        if target is None:
            raise HTTPException(status_code=404, detail="File no longer exists on disk.")
        if check:
            # UI preflight: confirm the media is still here WITHOUT starting a
            # transfer or triggering auto-delete. Browsers otherwise happily
            # save a 404/410 JSON body as a "file" when <a download> is used.
            try:
                size = target.stat().st_size
            except OSError:
                size = 0
            return {"ok": True, "filename": target.name, "size": size}
        remote_pull = not is_loopback(request.client.host if request.client else None)
        background = None
        if remote_pull and load_settings().auto_delete_after_serve:
            background = BackgroundTask(_cleanup_after_transfer, target, rec.job_id)
        return FileResponse(path=target, filename=target.name, background=background)
    finally:
        session.close()


def _cleanup_after_transfer(path: Path, job_id: str) -> None:
    """Delete the served file and mark its history row transferred (post-response)."""
    import logging as _logging

    _log = _logging.getLogger("lmd.routes.downloads")
    try:
        if path.is_file():
            path.unlink()
    except OSError as exc:
        _log.warning("could not remove transferred file %s: %s", path, exc)
        return
    from ..db import SessionLocal
    from ..models import DownloadRecord

    session = SessionLocal()
    try:
        rec = session.query(DownloadRecord).filter_by(job_id=job_id).first()
        if rec:
            rel, root = rec.file_path, rec.root_dir
            rec.file_path = ""
            rec.file_size = 0
            rec.transferred = 1
            # Duplicate history rows can share one landed file. Once it is
            # gone, every row must say "on your device" — otherwise the others
            # keep a Save link that downloads a 404 JSON body.
            if rel:
                siblings = session.query(DownloadRecord).filter(
                    DownloadRecord.file_path == rel,
                    DownloadRecord.root_dir == root,
                ).all()
                for sibling in siblings:
                    sibling.file_path = ""
                    sibling.file_size = 0
                    sibling.transferred = 1
            session.commit()
    finally:
        session.close()
    # Live Downloads tab: flip the Save link to "On your device" right away.
    manager.mark_transferred(job_id)
