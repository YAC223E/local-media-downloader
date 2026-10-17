"""Persistent download history rows."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class DownloadRecord(Base):
    __tablename__ = "downloads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(500), default="")
    platform: Mapped[str] = mapped_column(String(64), default="Other")
    thumbnail: Mapped[str] = mapped_column(Text, default="")
    format_label: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued|active|finished|error|cancelled
    file_path: Mapped[str] = mapped_column(Text, default="")  # path relative to download_dir
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    # Absolute shelf root at finish time: files keep resolving even after the
    # download folder is changed in Settings. "" = resolve against today.
    root_dir: Mapped[str] = mapped_column(Text, default="")
    # Where the download was ordered from: "laptop" (this machine) or "lan"
    # (phone/tablet over the network). Decides the shelf subfolder.
    origin: Mapped[str] = mapped_column(String(16), default="lan")
    # True once the server copy was handed to a LAN device and removed
    # (see auto_delete_after_serve). History stays; the file is gone.
    transferred: Mapped[int] = mapped_column(Integer, default=0)
    # Parent playlist job for per-episode rows ("" for standalone downloads).
    parent_job_id: Mapped[str] = mapped_column(String(64), default="")
    duration: Mapped[float] = mapped_column(Float, default=0)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
