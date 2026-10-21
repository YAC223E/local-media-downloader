import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, subscribeJob, type JobInfo, type StartPayload } from "./api";
import { useToast } from "../components/Toaster";

const ACTIVE = ["queued", "extracting", "downloading", "merging"];

interface JobsCtx {
  jobs: JobInfo[];
  activeCount: number;
  readyCount: number;
  /** True when a downloads fetch completed and failed (server unreachable). */
  loadFailed: boolean;
  start: (payload: StartPayload) => Promise<JobInfo | null>;
  startPlaylist: (payload: Parameters<typeof api.startPlaylist>[0]) => Promise<JobInfo | null>;
  cancel: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<JobsCtx | null>(null);
export const useJobs = () => useContext(Ctx)!;

/** Live downloads shared by Home and the Downloads tab (survives nav). */
export function JobsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const mapRef = useRef(new Map<string, JobInfo>());
  const unsubsRef = useRef(new Map<string, () => void>());

  const sync = useCallback(() => {
    // Backend returns active-first; preserve map order (insertion).
    setJobs(Array.from(mapRef.current.values()));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await api.downloads();
      for (const j of list) {
        const prev = mapRef.current.get(j.job_id);
        // Keep browser-session source URLs and any locally enriched fields.
        mapRef.current.set(j.job_id, prev ? { ...prev, ...j } : j);
      }
      setLoadFailed(false);
      sync();
    } catch {
      // Unreachable: keep last known rows and tell the page.
      setLoadFailed(true);
    }
  }, [sync]);

  const watch = useCallback(
    (id: string) => {
      unsubsRef.current.get(id)?.();
      const close = subscribeJob(
        id,
        (j) => {
          const prev = mapRef.current.get(id);
          mapRef.current.set(id, { ...(prev as JobInfo), ...j } as JobInfo);
          sync();
          if (["finished", "error", "cancelled"].includes(j.status)) close();
        },
        () => refresh(),
      );
      unsubsRef.current.set(id, close);
    },
    [refresh, sync],
  );

  const start = useCallback(
    async (payload: StartPayload) => {
      try {
        const s = await api.start(payload);
        const full: JobInfo = {
          ...s, title: payload.title, platform: payload.platform,
          thumbnail: payload.thumbnail, origin: "lan", is_parent: false,
          source_url: payload.url,
        };
        mapRef.current.set(s.job_id, full);
        sync();
        watch(s.job_id);
        return full;
      } catch (e) {
        toast({ title: "Could not start download", body: e instanceof Error ? e.message : "Start failed.", tone: "err" });
        return null;
      }
    },
    [sync, toast, watch],
  );

  const startPlaylist = useCallback(
    async (payload: Parameters<typeof api.startPlaylist>[0]) => {
      try {
        const s = await api.startPlaylist(payload);
        const full: JobInfo = {
          ...s, title: payload.title, platform: payload.platform,
          thumbnail: payload.thumbnail, origin: "lan", is_parent: true,
          source_url: payload.url,
        };
        mapRef.current.set(s.job_id, full);
        sync();
        watch(s.job_id);
        return full;
      } catch (e) {
        toast({ title: "Could not start download", body: e instanceof Error ? e.message : "Start failed.", tone: "err" });
        return null;
      }
    },
    [sync, toast, watch],
  );

  const cancel = useCallback(
    async (id: string) => {
      try {
        await api.cancel(id);
        refresh();
      } catch {
        /* worker already exited */
      }
    },
    [refresh],
  );

  // Gentle polling while anything is active (SSE covers the watched job).
  useEffect(() => {
    const t = window.setInterval(() => {
      const anyActive = Array.from(mapRef.current.values()).some((j) => ACTIVE.includes(j.status));
      if (anyActive) refresh();
    }, 3000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    refresh();
    const subs = unsubsRef.current;
    return () => subs.forEach((c) => c());
  }, [refresh]);

  const activeCount = useMemo(() => jobs.filter((j) => ACTIVE.includes(j.status)).length, [jobs]);
  const readyCount = useMemo(
    () => jobs.filter((j) => j.status === "finished" && !j.transferred && !j.is_parent).length,
    [jobs],
  );
  const value = useMemo(
    () => ({ jobs, activeCount, readyCount, loadFailed, start, startPlaylist, cancel, refresh }),
    [jobs, activeCount, readyCount, loadFailed, start, startPlaylist, cancel, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
