import { useEffect, useState } from "react";
import { fmtBytes, fmtEta, fmtSpeed } from "../lib/format";
import { api, type JobStatus } from "../lib/api";
import { Badge, toneFor } from "./ui/badge";

const STATUS_WORDS: Record<string, string> = {
  queued: "Waiting",
  extracting: "Reading link…",
  downloading: "Downloading…",
  merging: "Finishing…",
  finished: "Done",
  error: "Failed",
  cancelled: "Cancelled",
};

/** Signature move: the active download develops like a frame in the tray.
 *  Latent amber wash covers the frame and recedes left-to-right with progress;
 *  finished frames sit fixed with a fixer frame number. */
export function DevelopingFrame({
  thumbnail,
  title,
  frameNo,
  job,
  onCancel,
}: {
  thumbnail: string;
  title: string;
  frameNo: string;
  job: JobStatus | null;
  onCancel?: () => void;
}) {
  const pct = job ? Math.round(job.progress * 100) : 0;
  const done = job?.status === "finished";
  const merging = job?.status === "merging";
  // Honest activity signal: merges report no percentages, so count up elapsed
  // time instead of faking progress.
  const [mergeSecs, setMergeSecs] = useState(0);
  useEffect(() => {
    if (!merging) {
      setMergeSecs(0);
      return;
    }
    const started = Date.now();
    const tick = window.setInterval(
      () => setMergeSecs(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(tick);
  }, [merging, job?.job_id]);
  return (
    <figure className="sleeve frame-ticks overflow-hidden rounded-sm">
      <div className="relative aspect-video w-full overflow-hidden bg-panel2">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="bloom h-full w-full object-cover"
            style={{ filter: job && !done ? "saturate(0.55) contrast(1.02)" : undefined }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="mono text-xs uppercase tracking-[0.2em] text-muted">no frame loaded</span>
          </div>
        )}
        {job && (
          <div
            className={`develop ${done ? "done fixed" : ""}`}
            style={{ transform: done ? "scaleX(0)" : `scaleX(${(100 - pct) / 100})` }}
          />
        )}
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-3">
          <span className="line-clamp-2 text-left text-sm font-semibold text-[#f5efe0]">{title || "—"}</span>
          <span className="mono shrink-0 text-[11px] tracking-[0.14em] text-[#f5efe0]/85">FR {frameNo}</span>
        </figcaption>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline px-3 py-2">
        {job ? (
          <>
            <Badge tone={toneFor(job.status)}>{STATUS_WORDS[job.status] ?? job.status.toUpperCase()}</Badge>
            <span className="mono text-[13px] text-ink">
              {job.is_parent && job.children_total > 0 ? `${job.children_done} of ${job.children_total}` : `${pct}%`}
            </span>
            <span className="mono text-[12px] text-muted">
              {merging
                ? `Finishing… ${Math.floor(mergeSecs / 60)}:${String(mergeSecs % 60).padStart(2, "0")} — big files take a few minutes`
                : `${fmtBytes(job.downloaded_bytes)} / ${fmtBytes(job.total_bytes)} · ${fmtSpeed(job.speed)} · ETA ${fmtEta(job.eta)}`}
            </span>
            {job.error && <span className="text-[13px] text-grease">{job.error}</span>}
            {["queued", "extracting", "downloading", "merging"].includes(job.status) && onCancel && (
              <button onClick={onCancel} className="pressable mono ml-auto min-h-[44px] px-2 text-[13px] uppercase tracking-[0.12em] text-muted hover:text-grease">
                Cancel
              </button>
            )}
            {job.is_parent && job.current_title ? (
              <span className="mono w-full truncate text-[12px] text-muted">now: {job.current_title}</span>
            ) : null}
            {done && !job.is_parent && (
              <a
                href={api.fileUrl(job.job_id)}
                download
                className="pulse-once pressable mt-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-sm bg-amber px-4 text-[15px] font-bold text-onamber"
              >
                Save to this device
              </a>
            )}
          </>
        ) : (
          <span className="mono text-[12px] uppercase tracking-[0.14em] text-muted">paste a link to start</span>
        )}
      </div>
    </figure>
  );
}
