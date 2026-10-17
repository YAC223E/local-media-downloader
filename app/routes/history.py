"""History: list, re-download helper data, delete one, clear all."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_session
from ..downloads_manager import manager
from ..models import DownloadRecord
from ..schemas import HistoryItem

router = APIRouter(prefix="/api/history", tags=["history"])


def _to_item(rec: DownloadRecord) -> HistoryItem:
    live = manager.get(rec.job_id)
    return HistoryItem(
        id=rec.id, job_id=rec.job_id, url=rec.url, title=rec.title or rec.url,
        platform=rec.platform, thumbnail=rec.thumbnail, format_label=rec.format_label,
        status=rec.status, file_path=rec.file_path, file_size=rec.file_size,
        origin=rec.origin or "lan", transferred=rec.transferred or 0,
        parent_job_id=rec.parent_job_id or "",
        is_parent=bool(live.is_parent) if live else rec.format_label.startswith("playlist:"),
        children_total=len(live.children) if live else 0,
        children_done=live._children_done if live else 0,
        duration=rec.duration, error=rec.error,
        created_at=rec.created_at, finished_at=rec.finished_at,
    )


@router.get("", response_model=list[HistoryItem])
def list_history(limit: int = 100, session: Session = Depends(get_session)) -> list[HistoryItem]:
    recs = session.query(DownloadRecord).order_by(DownloadRecord.id.desc()).limit(min(limit, 500)).all()
    return [_to_item(r) for r in recs]


@router.delete("/{record_id}")
def delete_entry(record_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    rec = session.query(DownloadRecord).filter_by(id=record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="History entry not found.")
    session.delete(rec)
    session.commit()
    return {"ok": True}


@router.delete("")
def clear_history(session: Session = Depends(get_session)) -> dict[str, bool]:
    session.query(DownloadRecord).delete()
    session.commit()
    return {"ok": True}
