"""Pydantic schemas for the public API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FetchRequest(BaseModel):
    url: str


class FormatOption(BaseModel):
    format_id: str
    label: str  # e.g. "1080p MP4" / "Audio M4A 128k"
    kind: Literal["video", "audio"]
    ext: str = ""
    resolution: str = ""
    fps: int | None = None
    vcodec: str = ""
    acodec: str = ""
    filesize: int | None = None  # bytes when known
    tbr: float | None = None


class PlaylistEntry(BaseModel):
    id: str = ""
    title: str = ""
    thumbnail: str = ""
    duration: float | None = None
    url: str = ""
    have_it: bool = False  # already grabbed (download-archive)


class MediaInfo(BaseModel):
    id: str = ""
    title: str = ""
    platform: str = "Other"
    extractor: str = ""
    thumbnail: str = ""
    duration: float | None = None
    uploader: str = ""
    is_playlist: bool = False
    playlist_count: int | None = None
    new_count: int = 0  # playlist episodes not yet grabbed
    entries: list[PlaylistEntry] = Field(default_factory=list)
    subtitles: list[str] = Field(default_factory=list)  # manual caption languages
    automatic_captions: list[str] = Field(default_factory=list)  # auto-generated
    formats: list[FormatOption] = Field(default_factory=list)
    webpage_url: str = ""


class StartDownloadRequest(BaseModel):
    url: str
    format_id: str = "best"  # yt-dlp format selector, or "audio" / "audio:192" for mp3
    title: str = ""
    platform: str = "Other"
    thumbnail: str = ""
    audio_quality: str | None = None  # 128|192|320 override for this download
    subtitle_lang: str | None = None  # ISO code, "" = none for this download
    subtitle_mode: str | None = None  # off|embed|file override for this download
    needs_audio: bool = False  # picked format is video-only: merge best audio in


class StartPlaylistRequest(BaseModel):
    url: str
    format_id: str = "best"
    title: str = ""
    platform: str = "Other"
    thumbnail: str = ""
    playlist_id: str = ""
    entry_ids: list[str] | None = None  # None = all not-yet-grabbed
    entries: list[PlaylistEntry] = Field(default_factory=list)
    audio_quality: str | None = None
    subtitle_lang: str | None = None
    subtitle_mode: str | None = None
    needs_audio: bool = False


class JobStatus(BaseModel):
    job_id: str
    status: str  # queued|extracting|downloading|merging|finished|error|cancelled
    progress: float = 0.0  # 0..1
    downloaded_bytes: int = 0
    total_bytes: int | None = None
    speed: float | None = None  # bytes/s
    eta: int | None = None  # seconds
    filename: str = ""
    error: str = ""
    children_total: int = 0  # playlist parents only
    children_done: int = 0
    current_title: str = ""
    is_parent: bool = False
    transferred: bool = False  # LAN pull finished; server copy removed


class JobInfo(JobStatus):
    """Live job + identity for the Downloads tab."""

    title: str = ""
    platform: str = "Other"
    thumbnail: str = ""
    origin: str = "lan"


class HistoryItem(BaseModel):
    id: int
    job_id: str
    url: str
    title: str
    platform: str
    thumbnail: str
    format_label: str
    status: str
    file_path: str
    file_size: int
    origin: str = "lan"  # laptop|lan — where the download was ordered from
    transferred: int = 0  # 1 once the server copy left for a LAN device
    parent_job_id: str = ""  # playlist parent for episode rows
    is_parent: bool = False  # playlist grouping row (no file of its own)
    children_total: int = 0
    children_done: int = 0
    duration: float
    error: str
    created_at: datetime | None = None
    finished_at: datetime | None = None
