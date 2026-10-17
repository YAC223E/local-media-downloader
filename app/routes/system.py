"""System helpers: health, LAN IPs (shown on Home), engine status."""

from __future__ import annotations

import socket

from fastapi import APIRouter

from ..config import ffmpeg_available, ffmpeg_version, resolve_ffmpeg

router = APIRouter(prefix="/api/system", tags=["system"])


def _lan_ips() -> list[str]:
    ips: set[str] = set()
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, family=socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                ips.add(ip)
    except OSError:
        pass
    # Fallback trick: opening a UDP socket reveals the outbound interface IP.
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    return sorted(ips)


@router.get("")
def system_status() -> dict:
    ips = _lan_ips()
    return {
        "ok": True,
        "ffmpeg": ffmpeg_available(),
        "ffmpeg_path": resolve_ffmpeg(),
        "ffmpeg_version": ffmpeg_version(),
        "lan_ips": ips,
        "port": 8000,
        "urls": [f"http://{ip}:8000" for ip in ips],
    }
