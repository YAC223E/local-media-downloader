/** Typed API client for the FastAPI backend (same origin in prod, Vite proxy in dev). */

export interface FormatOption {
  format_id: string;
  label: string;
  kind: "video" | "audio";
  ext: string;
  resolution: string;
  fps: number | null;
  vcodec: string;
  acodec: string;
  filesize: number | null;
  tbr: number | null;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  thumbnail: string;
  duration: number | null;
  url: string;
  have_it: boolean;
}

export interface MediaInfo {
  id: string;
  title: string;
  platform: string;
  extractor: string;
  thumbnail: string;
  duration: number | null;
  uploader: string;
  is_playlist: boolean;
  playlist_count: number | null;
  new_count: number;
  entries: PlaylistEntry[];
  subtitles: string[];
  automatic_captions: string[];
  formats: FormatOption[];
  webpage_url: string;
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number | null;
  speed: number | null;
  eta: number | null;
  filename: string;
  error: string;
  children_total: number;
  children_done: number;
  current_title: string;
  is_parent: boolean;
  transferred?: boolean;
}

export interface JobInfo extends JobStatus {
  title: string;
  platform: string;
  thumbnail: string;
  origin: string;
  /** The source URL when this job was started from this browser session. */
  source_url?: string;
}

export interface HistoryItem {
  id: number;
  job_id: string;
  url: string;
  title: string;
  platform: string;
  thumbnail: string;
  format_label: string;
  status: string;
  file_path: string;
  file_size: number;
  origin: string;
  transferred: number;
  parent_job_id: string;
  is_parent: boolean;
  children_total: number;
  children_done: number;
  duration: number;
  error: string;
  created_at: string | null;
  finished_at: string | null;
}

export interface AppSettings {
  download_dir: string;
  preferred_quality: string;
  embed_thumbnail: boolean;
  embed_metadata: boolean;
  concurrent_limit: number;
  cookie_file: string;
  ffmpeg_path?: string;
  auto_delete_after_serve: boolean;
  audio_quality: string;
  default_to_audio: boolean;
  subtitle_mode: string;
  subtitle_lang: string;
  subtitle_auto_fallback: boolean;
}

export interface SystemStatus {
  ok: boolean;
  ffmpeg: boolean;
  ffmpeg_path?: string | null;
  ffmpeg_version?: string | null;
  lan_ips: string[];
  port: number;
  urls: string[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export interface StartPayload {
  url: string;
  format_id: string;
  title: string;
  platform: string;
  thumbnail: string;
  audio_quality?: string;
  subtitle_lang?: string | null;
  subtitle_mode?: string;
  needs_audio?: boolean;
}

export const api = {
  fetchInfo: (url: string) => req<MediaInfo>("/api/fetch", { method: "POST", body: JSON.stringify({ url }) }),
  start: (payload: StartPayload) =>
    req<JobStatus>("/api/downloads/start", { method: "POST", body: JSON.stringify(payload) }),
  startPlaylist: (payload: StartPayload & { playlist_id: string; entries: PlaylistEntry[]; entry_ids?: string[] }) =>
    req<JobStatus>("/api/downloads/start-playlist", { method: "POST", body: JSON.stringify(payload) }),
  downloads: () => req<JobInfo[]>("/api/downloads"),
  job: (id: string) => req<JobStatus>(`/api/downloads/${id}`),
  cancel: (id: string) => req<JobStatus>(`/api/downloads/${id}/cancel`, { method: "POST" }),
  fileUrl: (id: string) => `/api/downloads/${id}/file`,
  fileCheck: (id: string) =>
    req<{ ok: boolean; filename: string; size: number }>(`/api/downloads/${id}/file?check=1`),
  history: () => req<HistoryItem[]>("/api/history"),
  deleteEntry: (id: number) => req<{ ok: boolean }>(`/api/history/${id}`, { method: "DELETE" }),
  clearHistory: () => req<{ ok: boolean }>("/api/history", { method: "DELETE" }),
  settings: () => req<AppSettings>("/api/settings"),
  saveSettings: (patch: Partial<AppSettings>) =>
    req<AppSettings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
  system: () => req<SystemStatus>("/api/system"),
};

/** Subscribe to SSE progress frames; falls back gracefully on error. */
export function subscribeJob(id: string, onMsg: (j: JobStatus) => void, onError?: () => void): () => void {
  const src = new EventSource(`/api/downloads/${id}/events`);
  src.onmessage = (ev) => {
    try {
      onMsg(JSON.parse(ev.data) as JobStatus);
    } catch {
      /* ignore malformed frame */
    }
  };
  src.onerror = () => {
    src.close();
    onError?.();
  };
  return () => src.close();
}
