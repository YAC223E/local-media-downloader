"""POST /api/fetch — probe URL metadata + format list (no download)."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import load_settings
from ..schemas import FetchRequest, MediaInfo
from ..ytdlp_service import aprobe, validate_url

log = logging.getLogger("lmd.routes.info")
router = APIRouter(prefix="/api", tags=["info"])

# Short-lived probe cache: re-taps and retries skip a 5-15s re-extraction.
# Keyed by URL only (quality prefs don't change probe output); capped.
_probe_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_PROBE_TTL = 300.0
_PROBE_CAP = 50


@router.post("/fetch", response_model=MediaInfo)
async def fetch_info(body: FetchRequest) -> MediaInfo:
    try:
        url = validate_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    now = time.monotonic()
    hit = _probe_cache.get(url)
    if hit and now - hit[0] < _PROBE_TTL:
        return MediaInfo(**hit[1])
    try:
        info = await aprobe(url, load_settings())
    except asyncio.CancelledError:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        log.exception("fetch failed")
        raise HTTPException(status_code=500, detail="Metadata fetch failed.") from exc
    _probe_cache[url] = (now, info)
    if len(_probe_cache) > _PROBE_CAP:
        oldest = min(_probe_cache, key=lambda k: _probe_cache[k][0])
        del _probe_cache[oldest]
    return MediaInfo(**info)
