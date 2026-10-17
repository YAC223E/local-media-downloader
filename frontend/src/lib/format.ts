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

/** One vocabulary for job states lives in ../status.ts (single source). */

/** Short date stamp for history cards ("Oct 17", year shown when not this year). */
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
  const now = new Date();
  const day = `${month} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? day : `${day}, ${d.getFullYear()}`;
}

/** Friendly one-liners for the common engine failures; unknown text passes through. */
export function plainError(error: string): string {
  const low = error.toLowerCase();
  if (low.includes("timed out") || low.includes("timeout")) return "The internet was too slow — try again.";
  if (low.includes("private") || low.includes("login") || low.includes("cookies") || low.includes("sign in"))
    return "This video needs a login — add cookies in Settings, then try again.";
  if (low.includes("no video")) return "That post has no video in it — pick a post with a video.";
  if (low.includes("rate-limit") || low.includes("rate limit") || low.includes("too many requests"))
    return "X is rate-limiting right now — wait a few minutes and try again.";
  if (low.includes("ffmpeg")) return "A helper program (FFmpeg) is missing on the laptop.";
  if (low.includes("unsupported")) return "This link can't be downloaded.";
  return error;
}
