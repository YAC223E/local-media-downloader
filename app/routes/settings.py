"""Settings: read/update + cookie file upload."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..config import COOKIES_DIR, AppSettings, load_settings, save_settings
from ..downloads_manager import manager

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    download_dir: str | None = None
    preferred_quality: str | None = None
    embed_thumbnail: bool | None = None
    embed_metadata: bool | None = None
    concurrent_limit: int | None = None
    ffmpeg_path: str | None = None
    auto_delete_after_serve: bool | None = None
    audio_quality: str | None = None
    default_to_audio: bool | None = None
    subtitle_mode: str | None = None
    subtitle_lang: str | None = None
    subtitle_auto_fallback: bool | None = None


@router.get("", response_model=AppSettings)
def read_settings() -> AppSettings:
    return load_settings()


@router.put("", response_model=AppSettings)
def update_settings(body: SettingsUpdate) -> AppSettings:
    current = load_settings()
    data = body.model_dump(exclude_unset=True)
    if "concurrent_limit" in data:
        data["concurrent_limit"] = max(1, min(8, int(data["concurrent_limit"] or 2)))
    if "audio_quality" in data and data["audio_quality"] not in {"128", "192", "320"}:
        data["audio_quality"] = "320"
    if "subtitle_mode" in data and data["subtitle_mode"] not in {"off", "embed", "file"}:
        data["subtitle_mode"] = "embed"
    updated = AppSettings(**{**current.model_dump(), **data})
    save_settings(updated)
    manager.refresh_limit()
    return updated


@router.post("/cookies", response_model=AppSettings)
async def upload_cookies(file: UploadFile = File(...)) -> AppSettings:
    """Store a cookies.txt for login-gated sites (Instagram/Facebook/private)."""
    name = Path(file.filename or "cookies.txt").name
    if not name.endswith(".txt"):
        raise HTTPException(status_code=422, detail="Upload a Netscape cookies .txt file.")
    COOKIES_DIR.mkdir(parents=True, exist_ok=True)
    dest = COOKIES_DIR / "cookies.txt"
    dest.write_bytes(await file.read())
    settings = load_settings()
    settings.cookie_file = "cookies.txt"
    return save_settings(settings)


@router.delete("/cookies", response_model=AppSettings)
def remove_cookies() -> AppSettings:
    target = COOKIES_DIR / "cookies.txt"
    if target.exists():
        target.unlink()
    settings = load_settings()
    settings.cookie_file = ""
    return save_settings(settings)
