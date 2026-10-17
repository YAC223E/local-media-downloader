# Local Media Downloader

Fully local web app: paste a link → pick a format → watch it develop → keep it on your shelf. No accounts, no cloud, LAN-ready.

**Stack:** FastAPI + Uvicorn · Vite + React 18 + TypeScript + Tailwind (shadcn-spirit `ui/` primitives in `frontend/src/components/ui/`) · yt-dlp + FFmpeg · SQLite (SQLAlchemy) · `uv` + `pyproject.toml` · Python 3.12+.

## Prerequisites

- Python 3.12+ with [`uv`](https://docs.astral.sh/uv/) (or plain `pip`)
- Node 18+
- **FFmpeg on PATH** (required for merging + audio extraction). Installed via `winget install Gyan.FFmpeg` (v9.0.2). The app auto-detects it in this order: `settings.json` → `FFMPEG_PATH` env → `PATH` → known winget dirs, and passes it to yt-dlp as `ffmpeg_location`. The Home status strip shows `● ffmpeg ready` when detected; `/api/system` reports `ffmpeg_path` + `ffmpeg_version`.

## Run

Backend (from `local-media-downloader/`):

```powershell
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
# without uv:
pip install fastapi "uvicorn[standard]" yt-dlp sqlalchemy pydantic-settings python-multipart
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend dev (LAN proxy to `:8000` is preconfigured):

```powershell
cd frontend
npm install
npm run dev      # http://<your-lan-ip>:5173
```

Production single-origin: `cd frontend; npm run build`, then open `http://<your-lan-ip>:8000` — FastAPI serves `frontend/dist` when it exists. Your phone URL is shown on the Home status strip and header.

Server setup on this laptop: static IP `192.168.1.240` (gateway/DNS `192.168.1.1`,
set via `netsh` on the `Wi-Fi` adapter), scheduled task `Local Media Downloader`
at logon (hidden, restarts on failure, launcher `start-server.bat` → `server.log`),
firewall rule `Local Media Downloader` (inbound TCP 8000, Private). Phone URL:
`http://192.168.1.240:8000`. Hostname URLs (`http://DESKTOP-26AH489:8000`) do not
resolve from phones (no NetBIOS/mDNS there) — always use the IP.

## Phone home-screen app (PWA)

The app ships a web manifest, icon set (`frontend/public/icons/`), and a
service worker (`frontend/public/sw.js`: offline app shell, `/api/*` always
network-only). On your phone, open the LAN URL in Chrome → menu → **Add to
Home screen** (or **Install app** if offered) — you get the tray-and-arrow
icon and a standalone window without the browser chrome.

Note: service workers need a secure context, so the offline shell is active on
`localhost` (the laptop itself); over a LAN IP the shortcut, icon, and
standalone display still work, but the shell always loads fresh from the
laptop. True offline-over-LAN would need HTTPS (e.g. `mkcert`) — future work.

## How it works

- `POST /api/fetch` probes metadata + the format ledger (resolution, size estimate, codec, FPS) without downloading. Basic playlists are detected (first 25 items).
- `POST /api/downloads/start` runs yt-dlp in a worker thread (`app/downloads_manager.py`, concurrency-capped, cancellable). Progress streams over `GET /api/downloads/{id}/events` (SSE) with polling fallback.
- Files land in `downloads/<Platform>/` as `%(title)s [%(id)s].%(ext)s`. Finished files download through `GET /api/downloads/{id}/file` (server-resolved paths only — no path traversal).
- **Playlists:** probe lists up to 50 episodes with ✓ for already-grabbed ones (yt-dlp download-archive in `archives/`). `POST /api/downloads/start-playlist` downloads only the new ones as individually tracked jobs under one parent (`<Platform>/<Playlist>/`).
- **Audio:** "Sound only" extracts MP3 at 128/192/320 kbps (default 320) with thumbnail + metadata embedded; `default_to_audio` pre-selects it.
- **Subtitles:** manual captions preferred, auto-generated fallback optional; embedded in mp4 or saved as sidecar `.srt` (`subtitle_mode`, `subtitle_lang` choosable per download and in Settings).
- History persists in `history.db` (SQLite). Settings live in `settings.json`. Cookies (`cookies/cookies.txt`) unlock Instagram/Facebook/private items via the Settings page.
- Shelf layout splits by origin: orders from this laptop's browser file into `This Laptop/<Platform>/`; phone/tablet orders file into `<Platform>/`. With `auto_delete_after_serve` (on by default, toggle in Settings), the server copy is removed right after a phone/tablet pulls it — history stays and shows "on your device". Laptop pulls never delete.
- Missing FFmpeg and login-gated failures return actionable messages instead of tracebacks.

## Project layout

```
app/                  FastAPI backend
  main.py             entrypoint (serves frontend/dist when built)
  config.py           settings.json, folders, platform mapping
  ytdlp_service.py    yt-dlp wrapper (probe, shaped formats, guarded download)
  downloads_manager.py  threaded jobs, SSE state, cancel, history writes
  routes/             info, downloads, history, settings, system
frontend/src/
  pages/              Home, History, Settings
  components/         DevelopingFrame (signature), FormatLedger, PlatformMark…
  components/ui/      shadcn-spirit button/input/badge
  lib/                api client, formatters
```

## Design

See `../DESIGN.md` for the Contact Sleeve visual world, and `../PRODUCT.md` for product truth. Build path this session: **code-led** (no image generation available; nothing stored to config).
