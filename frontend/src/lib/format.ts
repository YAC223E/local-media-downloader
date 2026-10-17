/** Human-readable bytes / speed / ETA / durations for the mono readouts. */

export function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

export function fmtSpeed(bps: number | null | undefined): string {
  if (bps == null || bps <= 0) return "—";
  return `${fmtBytes(bps)}/s`;
}

export function fmtEta(sec: number | null | undefined): string {
  if (sec == null || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** youtube.com/watch?v=… → youtube; tiktok.com/@… → tiktok; used for the platform glyph. */
export function platformKey(platform: string, url: string): string {
  const p = (platform + " " + url).toLowerCase();
  if (p.includes("youtu")) return "youtube";
  if (p.includes("tiktok")) return "tiktok";
  if (p.includes("insta")) return "instagram";
  if (p.includes("facebook") || p.includes("fb.watch")) return "facebook";
  if (p.includes("twitter") || p.includes("x.com")) return "x";
  if (p.includes("reddit")) return "reddit";
  if (p.includes("vimeo")) return "vimeo";
  if (p.includes("twitch")) return "twitch";
  return "other";
}
