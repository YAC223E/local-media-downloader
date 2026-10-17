"""Runtime settings: JSON file + env overrides, single source of truth for folders/quality."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "settings.json"
#: Default shelf: the OS Downloads folder, inside our own subfolder so we
#: never scatter files loose next to the user's own downloads. Changeable
#: anytime on the Settings page (persisted in settings.json).
DEFAULT_DOWNLOADS_DIR = Path.home() / "Downloads" / "Local Media Downloader"
DOWNLOADS_DIR = DEFAULT_DOWNLOADS_DIR
COOKIES_DIR = BASE_DIR / "cookies"
DB_PATH = BASE_DIR / "history.db"
#: Previous location (project-local); kept as a fallback so history entries
#: recorded before the move still resolve their files.
LEGACY_DOWNLOADS_DIR = BASE_DIR / "downloads"
#: yt-dlp download-archive files (one per playlist: IDs already grabbed).
ARCHIVE_DIR = BASE_DIR / "archives"
#: Shelf subfolder for downloads ordered from this laptop's own browser.
#: LAN devices (phones/tablets) file straight into <Platform>/.
LOCAL_FOLDER = "This Laptop"


class AppSettings(BaseModel):
    """Persisted user settings (editable on the Settings page)."""

    download_dir: str = Field(default_factory=lambda: str(DEFAULT_DOWNLOADS_DIR))
    preferred_quality: str = Field(default="best", description="'best' or e.g. '1080', '720', 'audio'")
    embed_thumbnail: bool = True
    embed_metadata: bool = True
    concurrent_limit: int = Field(default=2, ge=1, le=8)
    cookie_file: str = ""  # filename inside cookies/ ("" = none)
    ffmpeg_path: str = ""  # explicit ffmpeg binary ("" = auto-detect via PATH)
    # When a LAN device pulls a finished file, remove the server copy right
    # after the transfer so the laptop doesn't fill up. Local (laptop browser)
    # transfers never delete: the file already lives on this machine.
    auto_delete_after_serve: bool = True
    # Audio: preferred MP3 quality for "Sound only" (128/192/320 kbps).
    audio_quality: str = "320"
    # When on, every fetch pre-selects "Sound only" (for music-first users).
    default_to_audio: bool = False
    # Subtitles: "off" | "embed" (inside mp4) | "file" (sidecar .srt).
    subtitle_mode: str = "embed"
    # Default subtitle language (ISO code); choosable per download in the UI.
    subtitle_lang: str = "en"
    # Fall back to auto-generated captions when manual ones are missing.
    subtitle_auto_fallback: bool = True


def _defaults() -> AppSettings:
    return AppSettings()


def load_settings() -> AppSettings:
    """Read settings.json; fall back to defaults on first run or corrupt file.

    Cached by file mtime so hot paths (every probe/download/poll) don't
    re-read and re-parse the file dozens of times a second.
    """
    try:
        mtime = SETTINGS_PATH.stat().st_mtime
    except OSError:
        mtime = -1.0
    cached = _settings_cache["settings"]
    if cached is not None and _settings_cache["mtime"] == mtime:
        return cached
    try:
        data: dict[str, Any] = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
        settings = AppSettings(**data)
    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        settings = _defaults()
        save_settings(settings)
        return settings
    _settings_cache["settings"] = settings
    try:
        _settings_cache["mtime"] = SETTINGS_PATH.stat().st_mtime
    except OSError:
        _settings_cache["mtime"] = -1.0
    return settings


_settings_cache: dict[str, Any] = {"settings": None, "mtime": -2.0}


def save_settings(settings: AppSettings) -> AppSettings:
    SETTINGS_PATH.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
    Path(settings.download_dir).mkdir(parents=True, exist_ok=True)
    _settings_cache["settings"] = settings
    try:
        _settings_cache["mtime"] = SETTINGS_PATH.stat().st_mtime
    except OSError:
        _settings_cache["mtime"] = -1.0
    invalidate_ffmpeg_cache()
    return settings


def _winget_ffmpeg_candidates() -> list[Path]:
    """Common Gyan.FFmpeg winget install locations (PATH shim may not survive restarts)."""
    local = Path(os.environ.get("LOCALAPPDATA", ""))
    roots = [local / "Microsoft" / "WinGet" / "Packages"]
    found: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        # e.g. .../Gyan.FFmpeg_Microsoft.Winget.Source_xxx/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe
        found.extend(root.glob("Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe"))
        found.extend(root.glob("Gyan.FFmpeg*/ffmpeg.exe"))
    return sorted(found)


_ffmpeg_cache: dict[str, Any] = {"path": "unset", "at": 0.0, "version": "unset", "vat": 0.0}
_FFMPEG_TTL = 60.0
_FFMPEG_VERSION_TTL = 300.0


def invalidate_ffmpeg_cache() -> None:
    _ffmpeg_cache.update({"path": "unset", "at": 0.0, "version": "unset", "vat": 0.0})


def resolve_ffmpeg() -> str | None:
    """Return a usable ffmpeg binary path, or None if not found.

    Order: explicit setting -> FFMPEG_PATH env -> PATH -> known winget dirs.
    Result cached briefly: resolution scans PATH and the winget tree, which
    is wasteful on every probe/download/system poll.
    """
    now = time.monotonic()
    if _ffmpeg_cache["path"] != "unset" and now - _ffmpeg_cache["at"] < _FFMPEG_TTL:
        return _ffmpeg_cache["path"]
    found = _resolve_ffmpeg_uncached()
    _ffmpeg_cache.update({"path": found, "at": now})
    return found


def _resolve_ffmpeg_uncached() -> str | None:
    try:
        explicit = load_settings().ffmpeg_path.strip()
    except (ValueError, OSError):
        explicit = ""
    if explicit and Path(explicit).exists():
        return explicit
    env_path = os.environ.get("FFMPEG_PATH", "").strip().strip('"')
    if env_path and Path(env_path).exists():
        return env_path
    on_path = shutil.which("ffmpeg")
    if on_path:
        return on_path
    for candidate in _winget_ffmpeg_candidates():
        if candidate.exists():
            return str(candidate)
    return None


def ffmpeg_available() -> bool:
    """Check for an FFmpeg binary (merging / audio extraction needs it)."""
    return resolve_ffmpeg() is not None


def ffmpeg_version() -> str | None:
    """Short version string (e.g. '9.0.2-full_build') or None if not runnable."""
    now = time.monotonic()
    if _ffmpeg_cache["version"] != "unset" and now - _ffmpeg_cache["vat"] < _FFMPEG_VERSION_TTL:
        return _ffmpeg_cache["version"]
    binary = resolve_ffmpeg()
    version: str | None = None
    if binary:
        try:
            out = subprocess.run([binary, "-version"], capture_output=True, text=True, timeout=10)
            first = (out.stdout or "").splitlines()
            if first:
                # 'ffmpeg version 9.0.2-full_build-www.gyan.dev ...' -> '9.0.2-full_build'
                parts = first[0].split()
                version = parts[2] if len(parts) >= 3 else first[0][:60]
        except (OSError, subprocess.SubprocessError):
            pass
    _ffmpeg_cache.update({"version": version, "vat": now})
    return version


def is_loopback(host: str | None) -> bool:
    """True when the request came from this laptop's own browser."""
    if not host:
        return False
    host = host.split("%")[0].strip("[]").lower()
    return host in {"127.0.0.1", "::1", "localhost"} or host.startswith("127.")


def platform_of(extractor: str | None, url: str) -> str:
    """Map yt-dlp extractor names + URL hints to a display platform folder."""
    ex = (extractor or "").lower()
    u = url.lower()
    mapping = [
        ("youtube", "YouTube"), ("youtu.be", "YouTube"),
        ("tiktok", "TikTok"), ("instagram", "Instagram"),
        ("facebook", "Facebook"), ("fb.watch", "Facebook"),
        ("twitter", "X"), ("x.com", "X"),
        ("reddit", "Reddit"), ("vimeo", "Vimeo"),
        ("twitch", "Twitch"), ("soundcloud", "SoundCloud"),
    ]
    for key, label in mapping:
        if key in ex or key in u:
            return label
    return (extractor or "Other").strip().title() or "Other"
