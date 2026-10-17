"""FastAPI entrypoint: API + optional static frontend, LAN-ready.

Run:  uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import COOKIES_DIR, DOWNLOADS_DIR
from .db import init_db
from .routes import downloads, history, info, settings, system

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s: %(message)s")
log = logging.getLogger("lmd")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    COOKIES_DIR.mkdir(parents=True, exist_ok=True)
    log.info("downloads -> %s", DOWNLOADS_DIR)
    yield


app = FastAPI(title="Local Media Downloader", version="0.1.0", lifespan=lifespan)

# LAN devices call the API directly — allow them.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(info.router)
app.include_router(downloads.router)
app.include_router(history.router)
app.include_router(settings.router)
app.include_router(system.router)


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


# Serve the built React app when `frontend/dist` exists (single-origin LAN use).
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    app.mount("/icons", StaticFiles(directory=FRONTEND_DIST / "icons"), name="icons")

    @app.get("/sw.js")
    def service_worker():
        # no-cache so updates activate promptly; SW-Allowed scopes control to "/".
        return FileResponse(
            FRONTEND_DIST / "sw.js",
            media_type="application/javascript",
            headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"},
        )

    @app.get("/manifest.webmanifest")
    def web_manifest():
        return FileResponse(
            FRONTEND_DIST / "manifest.webmanifest",
            media_type="application/manifest+json",
        )

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith("api/"):
            return {"detail": "Not found"}
        index = FRONTEND_DIST / "index.html"
        return FileResponse(index)
