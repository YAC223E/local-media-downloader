import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type HistoryItem, type JobInfo } from "./api";
import { useJobs } from "./jobs";

export const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

/** The shape both live jobs and archive records collapse into for the shelf. */
export interface ShelfRow {
  jobId: string;
  historyId: number | null;
  title: string;
  platform: string;
  thumbnail: string;
  origin: string;
  url: string;
  status: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speed: number | null;
  eta: number | null;
  fileSize: number;
  filePath: string;
  transferred: boolean;
  isParent: boolean;
  childrenDone: number;
  childrenTotal: number;
  currentTitle: string;
  error: string;
  createdAt: string | null;
  finishedAt: string | null;
  /** Present while the browser session still has the live job. */
  job: JobInfo | null;
}

export const isWorking = (row: ShelfRow) => LIVE.includes(row.status);
export const isFailed = (row: ShelfRow) => row.status === "error" || row.status === "cancelled";
export const isReady = (row: ShelfRow) =>
  row.status === "finished" &&
  !row.transferred &&
  !row.isParent &&
  (row.job !== null || !!row.filePath);
export const isSaved = (row: ShelfRow) => row.status === "finished" && row.transferred;
export const isFinishedOther = (row: ShelfRow) =>
  row.status === "finished" && !isReady(row) && !isSaved(row);

let cache: HistoryItem[] = [];

function fromJob(job: JobInfo, item: HistoryItem | undefined): ShelfRow {
  const progress = job.is_parent
    ? job.children_total
      ? (job.children_done / job.children_total) * 100
      : Math.round((job.progress ?? 0) * 100)
    : Math.round((job.progress ?? 0) * 100);

  return {
    jobId: job.job_id,
    historyId: item?.id ?? null,
    title: job.title || item?.title || "Untitled download",
    platform: job.platform || item?.platform || "",
    thumbnail: job.thumbnail || item?.thumbnail || "",
    origin: job.origin || item?.origin || "lan",
    url: job.source_url || item?.url || "",
    status: job.status,
    progress,
    downloadedBytes: job.downloaded_bytes || 0,
    totalBytes: job.total_bytes,
    speed: job.speed,
    eta: job.eta,
    fileSize: item?.file_size || job.total_bytes || job.downloaded_bytes || 0,
    filePath: item?.file_path || "",
    transferred: !!job.transferred || !!item?.transferred,
    isParent: !!job.is_parent,
    childrenDone: job.children_done ?? item?.children_done ?? 0,
    childrenTotal: job.children_total ?? item?.children_total ?? 0,
    currentTitle: job.current_title || "",
    error: job.error || item?.error || "",
    createdAt: item?.created_at ?? null,
    finishedAt: item?.finished_at ?? null,
    job,
  };
}

function fromHistory(item: HistoryItem): ShelfRow {
  // A live status with no matching in-memory job means the service restarted
  // or crashed mid-download. Show it honestly instead of as phantom work.
  const interrupted = LIVE.includes(item.status);
  return {
    jobId: item.job_id,
    historyId: item.id,
    title: item.title || "Untitled download",
    platform: item.platform || "",
    thumbnail: item.thumbnail || "",
    origin: item.origin || "lan",
    url: item.url || "",
    status: interrupted ? "cancelled" : item.status,
    progress: item.status === "finished" ? 100 : 0,
    downloadedBytes: 0,
    totalBytes: null,
    speed: null,
    eta: null,
    fileSize: item.file_size || 0,
    filePath: item.file_path || "",
    transferred: !!item.transferred,
    isParent: !!item.is_parent,
    childrenDone: item.children_done || 0,
    childrenTotal: item.children_total || 0,
    currentTitle: "",
    error:
      interrupted && !item.error
        ? "The service restarted before this download finished. Start it again from the shelf."
        : item.error || "",
    createdAt: item.created_at,
    finishedAt: item.finished_at,
    job: null,
  };
}

/**
 * One source of truth for the shelf: live jobs overlaid on the archive.
 *
 * A finished job can appear in both lists. The live row wins so progress and
 * SaveLink state stay attached to the same card; archive-only rows fill in
 * everything from previous browser sessions.
 */
export function useShelfData(refreshKey = 0) {
  const { jobs } = useJobs();
  const [history, setHistory] = useState<HistoryItem[]>(cache);
  const [loading, setLoading] = useState(cache.length === 0);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const load = useCallback(async (quiet: boolean) => {
    if (!quiet) setLoading(true);
    try {
      const next = await api.history();
      cache = next;
      setHistory(next);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(cache.length > 0);
  }, [load, refreshKey]);

  useEffect(() => {
    const onSaved = () => void load(true);
    window.addEventListener("lmd:saved", onSaved);
    return () => window.removeEventListener("lmd:saved", onSaved);
  }, [load]);

  const finishedCount = useMemo(
    () => jobs.filter((job) => job.status === "finished" || job.status === "error" || job.status === "cancelled").length,
    [jobs],
  );
  useEffect(() => {
    if (!finishedCount) return;
    const timer = window.setTimeout(() => void load(true), 700);
    return () => window.clearTimeout(timer);
  }, [finishedCount, load]);

  const historyByJob = useMemo(
    () => new Map(history.map((item) => [item.job_id, item])),
    [history],
  );

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const merged: ShelfRow[] = [];

    for (const job of jobs) {
      if (hidden.has(job.job_id) && !LIVE.includes(job.status)) continue;
      merged.push(fromJob(job, historyByJob.get(job.job_id)));
      seen.add(job.job_id);
    }

    for (const item of history) {
      if (seen.has(item.job_id) || hidden.has(item.job_id)) continue;
      merged.push(fromHistory(item));
    }

    return merged;
  }, [history, historyByJob, hidden, jobs]);

  const counts = useMemo(() => {
    let working = 0;
    let ready = 0;
    let saved = 0;
    let other = 0;
    let failedCount = 0;
    for (const row of rows) {
      if (isWorking(row)) working += 1;
      else if (isReady(row)) ready += 1;
      else if (isSaved(row)) saved += 1;
      else if (isFinishedOther(row)) other += 1;
      else if (isFailed(row)) failedCount += 1;
    }
    return { working, ready, saved, other, failed: failedCount, total: rows.length };
  }, [rows]);

  const remove = useCallback(async (row: ShelfRow) => {
    if (!row.historyId) return false;
    await api.deleteEntry(row.historyId);
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== row.historyId);
      cache = next;
      return next;
    });
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(row.jobId);
      return next;
    });
    return true;
  }, []);

  const clear = useCallback(async () => {
    await api.clearHistory();
    cache = [];
    setHistory([]);
    setHidden((prev) => {
      const next = new Set(prev);
      for (const row of rows) {
        if (!LIVE.includes(row.status)) next.add(row.jobId);
      }
      return next;
    });
  }, [rows]);

  return {
    rows,
    counts,
    loading,
    failed,
    hasHistory: history.length > 0,
    reload: () => load(false),
    remove,
    clear,
  };
}

export type ShelfData = ReturnType<typeof useShelfData>;
