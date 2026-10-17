"""Download lifecycle: start, poll, SSE stream, cancel, serve finished file."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask

from ..config import is_loopback, load_settings
from ..downloads_manager import manager
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


@router.get("/{job_id}/file")
async def download_file(job_id: str, request: Request):
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
        if not rec or not rec.file_path:
            if rec and rec.transferred:
                raise HTTPException(status_code=410, detail="Already saved to your device — the server copy was removed.")
            raise HTTPException(status_code=404, detail="No file recorded for this download yet.")
        base = Path(load_settings().download_dir).resolve()
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
            rec.file_path = ""
            rec.file_size = 0
            rec.transferred = 1
            session.commit()
    finally:
        session.close()
