"""Thin yt-dlp wrapper: metadata probing + format shaping + guarded downloading.

Runs blocking yt-dlp calls in worker threads so the async server stays responsive.
Cancellation is cooperative via the progress hook (raises to abort mid-download).
"""

from __future__ import annotations

import asyncio
import logging
import re
from pathlib import Path
from typing import Any, Callable

import yt_dlp

from .config import AppSettings, platform_of

log = logging.getLogger("lmd.ytdlp")

ProgressCb = Callable[[dict[str, Any]], None]
URL_RE = re.compile(r"^https?://\S+$", re.IGNORECASE)


def validate_url(url: str) -> str:
    url = (url or "").strip()
    if not URL_RE.match(url):
        raise ValueError("Paste a full http(s) URL first.")
    return url


def _base_opts(settings: AppSettings, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    from .config import resolve_ffmpeg

    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": False,  # basic playlist support; capped below
        # Network resilience: YouTube throttles single connections and HLS/DASH
        # fragments fail sporadically. Retry with backoff instead of dying fast.
        "socket_timeout": 60,
        "retries": 10,
        "fragment_retries": 10,
        "retry_sleep": "exp=1:5",
        "concurrent_fragment_downloads": 4,
    }
    ffmpeg = resolve_ffmpeg()
    if ffmpeg:
        # Explicit path so merging/audio extraction works even when the
        # winget PATH shim hasn't propagated to the server process.
        opts["ffmpeg_location"] = ffmpeg
    if settings.cookie_file:
        cookie_path = Path(settings.cookie_file)
        if not cookie_path.is_absolute():
            from .config import COOKIES_DIR

            cookie_path = COOKIES_DIR / settings.cookie_file
        if cookie_path.exists():
            opts["cookiefile"] = str(cookie_path)
    if extra:
        opts.update(extra)
    return opts


def archive_path(playlist_id: str) -> Path:
    """File tracking which playlist items were already grabbed (yt-dlp format)."""
    from .config import ARCHIVE_DIR

    safe = "".join(c for c in playlist_id if c.isalnum() or c in ("-", "_")).strip() or "playlist"
    return ARCHIVE_DIR / f"{safe}.txt"


def archived_ids(playlist_id: str) -> set[str]:
    """IDs recorded in the playlist's download-archive (last token per line)."""
    try:
        lines = archive_path(playlist_id).read_text(encoding="utf-8").splitlines()
    except OSError:
        return set()
    return {ln.split()[-1] for ln in lines if ln.split()}


def _shape_format(f: dict[str, Any]) -> dict[str, Any] | None:
    """Keep downloadable, playable renditions; drop storyboards/mhtml.

    Some sites (notably X/Twitter HLS) leave vcodec/acodec unparsed (None).
    Those must be KEPT, not dropped: audio tracks arrive as v=none/a=none
    (e.g. "hls-audio-*"), and direct http mp4s may carry no codec labels at
    all while holding perfectly good combined streams. Dropping them used to
    strip X downloads of every audio track and the best direct files.
    """
    fid = str(f.get("format_id") or "")
    if not fid or f.get("protocol", "").startswith("mhtml"):
        return None
    vcodec = (f.get("vcodec") or "none").split(".")[0]
    acodec = (f.get("acodec") or "none").split(".")[0]
    ext = (f.get("ext") or "").lower()
    if vcodec == "none" and acodec == "none":
        if "audio" in fid.lower() or ext in {
            "mp3", "m4a", "aac", "opus", "ogg", "oga", "flac",
            "wav", "wma", "aiff", "alac",
        }:
            vcodec, acodec = "none", "unknown"
        elif ext in {"mp4", "webm", "mov", "m4v", "mkv"}:
            # Unknown codecs in a video container: assume a combined stream
            # and download as-is (never force a merge onto these).
            vcodec, acodec = "unknown", "unknown"
        else:
            return None
    height = f.get("height")
    ext = (f.get("ext") or "").upper()
    size = f.get("filesize") or f.get("filesize_approx")
    if vcodec != "none":
        label = f"{height}p {ext}".strip() if height else f"Video {ext}".strip()
        kind = "video"
        resolution = f"{f.get('width', '')}x{height}" if height else ""
    else:
        abr = f.get("abr") or f.get("tbr")
        label = f"Audio {ext} {int(abr)}k".strip() if abr else f"Audio {ext}".strip()
        kind = "audio"
        resolution = ""
    return {
        "format_id": fid,
        "label": label,
        "kind": kind,
        "ext": f.get("ext") or "",
        "resolution": resolution,
        "fps": f.get("fps"),
        "vcodec": vcodec,
        "acodec": acodec,
        "filesize": int(size) if size else None,
        "tbr": f.get("tbr"),
    }


def probe(url: str, settings: AppSettings) -> dict[str, Any]:
    """Extract metadata + shaped format list without downloading (thread-blocking)."""
    url = validate_url(url)
    with yt_dlp.YoutubeDL(_base_opts(settings, {"playlistend": 50})) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as exc:
            raise RuntimeError(_friendly_error(exc)) from exc
    if not info:
        raise RuntimeError("No metadata came back for that URL.")
    if info.get("_type") == "playlist":
        raw_entries = [e for e in (info.get("entries") or []) if e][:50]
        pid = str(info.get("id") or "playlist")
        have = archived_ids(pid)
        entries = [{
            "id": str(e.get("id") or ""),
            "title": e.get("title") or "Untitled",
            "thumbnail": e.get("thumbnail") or "",
            "duration": e.get("duration"),
            "url": e.get("webpage_url") or e.get("url") or url,
            "have_it": str(e.get("id") or "") in have,
        } for e in raw_entries if isinstance(e, dict)]
        return {
            "id": pid,
            "title": info.get("title") or "Playlist",
            "platform": platform_of(info.get("extractor"), url),
            "extractor": info.get("extractor") or "",
            "thumbnail": (entries[0]["thumbnail"] if entries else ""),
            "duration": None,
            "uploader": info.get("uploader") or "",
            "is_playlist": True,
            "playlist_count": len(entries),
            "new_count": sum(1 for e in entries if not e["have_it"]),
            "entries": entries,
            "formats": [],
            "webpage_url": info.get("webpage_url") or url,
        }
    formats = [_shape_format(f) for f in (info.get("formats") or [])]
    formats = [f for f in formats if f]
    # Best-first ordering: combined video+audio, then video, then audio.
    # tbr breaks ties when sizes are unknown (e.g. X/Twitter HLS).
    formats.sort(
        key=lambda f: (
            0 if (f["vcodec"] != "none" and f["acodec"] != "none") else 1,
            -(f.get("filesize") or 0),
            -(f.get("tbr") or 0),
        )
    )
    return {
        "id": str(info.get("id") or ""),
        "title": info.get("title") or "Untitled",
        "platform": platform_of(info.get("extractor"), url),
        "extractor": info.get("extractor") or "",
        "thumbnail": info.get("thumbnail") or "",
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or "",
        "is_playlist": False,
        "playlist_count": None,
        # Manual subtitle languages first, auto-generated flagged separately —
        # the UI offers manual first and labels the fallback honestly.
        "subtitles": sorted((info.get("subtitles") or {}).keys()),
        "automatic_captions": sorted((info.get("automatic_captions") or {}).keys()),
        "formats": formats[:40],
        "webpage_url": info.get("webpage_url") or url,
    }


async def aprobe(url: str, settings: AppSettings) -> dict[str, Any]:
    return await asyncio.to_thread(probe, url, settings)


class Cancelled(Exception):
    pass


AUDIO_QUALITIES = ("128", "192", "320")


def parse_audio_quality(format_id: str, settings: AppSettings) -> str | None:
    """Return the MP3 kbps for audio requests ("audio" / "audio:192"), else None."""
    fid = (format_id or "").strip().lower()
    if fid in {"audio", "mp3", "bestaudio"}:
        q = settings.audio_quality if settings.audio_quality in AUDIO_QUALITIES else "320"
        return q
    if fid.startswith("audio:"):
        q = fid.split(":", 1)[1]
        return q if q in AUDIO_QUALITIES else "320"
    return None


def download(
    url: str,
    format_id: str,
    settings: AppSettings,
    outtmpl: str,
    on_progress: ProgressCb,
    should_cancel: Callable[[], bool],
    on_status: Callable[[str], None],
    media_opts: dict[str, Any] | None = None,
    needs_audio: bool = False,
) -> dict[str, Any]:
    """Download one item; returns the final filepath info. Raises on error/cancel.

    media_opts carries per-download overrides from the UI:
      {"audio_quality": "320", "subtitle_lang": "fr"|None, "subtitle_mode": ...}
    Missing keys fall back to settings.
    needs_audio: the picked format is video-only (e.g. YouTube 137) — merge
      the best audio track in, otherwise the file comes out silent.
    """
    url = validate_url(url)
    media_opts = media_opts or {}
    quality = parse_audio_quality(format_id, settings)
    if quality and isinstance(media_opts.get("audio_quality"), str):
        q = media_opts["audio_quality"]
        quality = q if q in AUDIO_QUALITIES else quality
    audio_only = quality is not None
    # NOTE on audio compatibility: merges land in an .mp4 container, and
    # phones (notably iPhones) can't play every codec inside mp4. Prefer
    # AAC-in-m4a audio tracks and fall back to plain bestaudio, so merged
    # files actually produce sound on the device, not just on the laptop.
    audio_pick = "bestaudio[ext=m4a]/bestaudio"
    if audio_only:
        fmt = "bestaudio/best"
    elif (format_id or "").strip().lower() == "best":
        # "best" alone means best SINGLE file — on YouTube that's usually a
        # video-only stream (silent file). Always mean best PAIR instead.
        fmt = f"bestvideo+{audio_pick}/bestvideo+bestaudio/best"
    elif needs_audio:
        fmt = f"{format_id}+{audio_pick}/bestvideo+bestaudio/best"
    else:
        fmt = format_id or "bestvideo+bestaudio/best"

    postprocessors: list[dict[str, Any]] = []
    if audio_only:
        postprocessors.append({
            "key": "FFmpegExtractAudio", "preferredcodec": "mp3",
            "preferredquality": quality,
        })
    if settings.embed_metadata:
        postprocessors.append({"key": "FFmpegMetadata", "add_metadata": True})
    if settings.embed_thumbnail:
        postprocessors.append({"key": "EmbedThumbnail"})

    sub_mode = media_opts.get("subtitle_mode", settings.subtitle_mode)
    sub_lang = media_opts.get("subtitle_lang", settings.subtitle_lang) or settings.subtitle_lang
    want_subs = sub_mode in {"embed", "file"} and not audio_only

    def hook(d: dict[str, Any]) -> None:
        if should_cancel():
            raise Cancelled("Cancelled by user.")
        status = d.get("status")
        if status == "downloading":
            on_progress({
                "downloaded_bytes": d.get("downloaded_bytes", 0),
                "total_bytes": d.get("total_bytes") or d.get("total_bytes_estimate"),
                "speed": d.get("speed"),
                "eta": d.get("eta"),
                "filename": d.get("filename", ""),
            })
        elif status == "finished":
            on_status("merging")
            on_progress({"filename": d.get("filename", "")})
    def pp_hook(d: dict[str, Any]) -> None:
        # Fires around each merge/convert step. yt-dlp gives no percentages
        # here, so we only refresh the heartbeat (UI shows elapsed time).
        if should_cancel():
            raise Cancelled("Cancelled by user.")
        on_status("merging")

    opts = _base_opts(settings, {
        "format": fmt,
        # outtmpl fields are sanitized by yt-dlp (path separators stripped);
        # the platform dir is allow-listed server-side in downloads_manager.
        "outtmpl": outtmpl,
        "merge_output_format": "mp4",
        "postprocessors": postprocessors,
        "progress_hooks": [hook],
        "postprocessor_hooks": [pp_hook],
        "restrictfilenames": False,
        # Subtitles: manual captions first, auto-generated as fallback when
        # enabled. Embed puts them inside mp4; "file" writes a sidecar .srt
        # next to the video via the same outtmpl (auto-tidy keeps working).
        "writesubtitles": want_subs,
        "writeautomaticsub": want_subs and settings.subtitle_auto_fallback,
        "subtitleslangs": [sub_lang] if want_subs else [],
        "subtitlesformat": "srt",
        "embedsubtitles": want_subs and sub_mode == "embed",
    })
    if isinstance(media_opts.get("download_archive"), str):
        # Playlist children record into the shared archive ("grabbed" checkmarks).
        opts["download_archive"] = media_opts["download_archive"]
    on_status("extracting")
    with yt_dlp.YoutubeDL(opts) as ydl:
        try:
            # extract_info(download=True) is what download() uses internally,
            # but it also gives us back the infodict after post-processing —
            # including the REAL landed path. Guessing from progress filenames
            # fails for temp names like ".fdash-123.m4a" (Instagram) and left
            # finished jobs with no recorded path, so saving returned JSON.
            info = ydl.extract_info(url, download=True)
        except Cancelled:
            raise
        except yt_dlp.utils.DownloadError as exc:
            raise RuntimeError(_friendly_error(exc)) from exc
    return {"ok": True, "filepath": _final_filepath(info)}


def _final_filepath(info: dict[str, Any] | None) -> str:
    """Return the actual file yt-dlp landed, after merge/move/postprocessing."""
    if not info:
        return ""
    for item in info.get("requested_downloads") or []:
        candidate = item.get("filepath") or item.get("_filename")
        if candidate:
            return str(candidate)
    candidate = info.get("filepath") or info.get("_filename")
    if candidate:
        return str(candidate)
    # Playlist result: first entry that landed a file.
    for entry in info.get("entries") or []:
        found = _final_filepath(entry)
        if found:
            return found
    return ""


def _friendly_error(exc: Exception) -> str:
    """Translate common yt-dlp failures into actionable user messages."""
    msg = str(exc)
    low = msg.lower()
    if "ffmpeg" in low and ("not found" in low or "not installed" in low):
        return "FFmpeg is missing — install it and restart the server (merging/audio needs it)."
    if "sign in" in low or "login" in low or "cookies" in low or "private" in low:
        return "This looks private or login-gated. Upload a cookies.txt on the Settings page and retry."
    if "unsupported url" in low:
        return "That URL is not supported by the downloader engine."
    if "no video could be found" in low:
        return "That post has no video in it — only posts with a video can be downloaded."
    if "rate limit" in low or "too many requests" in low or "429" in low:
        return "X is rate-limiting right now. Wait a few minutes and try again."
    if "requested format is not available" in low:
        return "That quality just expired on the site. Fetch the link again and pick a fresh quality."
    if "timed out" in low or "timeout" in low:
        detail = msg.split("\n")[0][:200]
        return f"The site timed out ({detail}). Check your connection and retry."
    # Keep the engine's detail but trimmed for the toast.
    return msg.split("\n")[0][:400] if msg else "Download failed for an unknown reason."
