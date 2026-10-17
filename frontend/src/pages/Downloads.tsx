import { api, type JobInfo } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { fmtBytes, fmtEta, fmtSpeed } from "../lib/format";
import { Badge, toneFor } from "../components/ui/badge";
import { EmptyState } from "../components/StatusStrip";
import { useToast } from "../components/Toaster";

const WORDS: Record<string, string> = {
  queued: "Waiting", extracting: "Reading link…", downloading: "Downloading…",
  merging: "Finishing…", finished: "Done", error: "Failed", cancelled: "Cancelled",
};

/** Downloads manager: live jobs grouped Active / Finished, phone-first rows. */
export function Downloads() {
  const { jobs, cancel } = useJobs();
  const toast = useToast();
  const active = jobs.filter((j) => ["queued", "extracting", "downloading", "merging"].includes(j.status));
  const done = jobs.filter((j) => ["finished", "error", "cancelled"].includes(j.status));

  const retry = async (_j: JobInfo) => {
    // The source URL lives on the History entry — point there, don't guess.
    toast({ title: "Re-download from History", body: "That entry has the original link.", tone: "info" });
  };

  if (!jobs.length) {
    return (
      <EmptyState
        title="Nothing downloading"
        body="Fetch a video on Home and it will appear here with live progress — even if you switch tabs."
      />
    );
  }

  return (
    <div className="grid gap-5">
      {active.length > 0 && (
        <section aria-label="Active downloads">
          <h2 className="mono px-1 pb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            Active · {active.length}
          </h2>
          <ol className="grid gap-3 md:grid-cols-2">
            {active.map((j) => (
              <Row key={j.job_id} job={j} onCancel={() => cancel(j.job_id)} />
            ))}
          </ol>
        </section>
      )}
      {done.length > 0 && (
        <section aria-label="Recent downloads">
          <h2 className="mono px-1 pb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            Recent · {done.length}
          </h2>
          <ol className="grid gap-3 md:grid-cols-2">
            {done.map((j) => (
              <Row key={j.job_id} job={j} onCancel={() => cancel(j.job_id)} onRetry={() => retry(j)} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Row({ job: j, onCancel, onRetry }: { job: JobInfo; onCancel: () => void; onRetry?: () => void }) {
  const pct = Math.round(j.progress * 100);
  const live = ["queued", "extracting", "downloading", "merging"].includes(j.status);
  return (
    <li className="sleeve overflow-hidden rounded-sm">
      <div className="flex items-center gap-3 p-3">
        {j.thumbnail ? (
          <img src={j.thumbnail} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded-sm object-cover" />
        ) : (
          <span className="grid h-12 w-20 shrink-0 place-items-center rounded-sm bg-panel2 text-[10px] text-muted">
            {j.platform}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{j.title || "Download"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <Badge tone={toneFor(j.status)}>{WORDS[j.status] ?? j.status}</Badge>
            <span className="mono text-[12px] text-ink">
              {j.is_parent && j.children_total > 0 ? `${j.children_done} of ${j.children_total}` : `${pct}%`}
            </span>
            {!j.is_parent && (
              <span className="mono text-[11px] text-muted">
                {fmtBytes(j.downloaded_bytes)} / {fmtBytes(j.total_bytes)} · {fmtSpeed(j.speed)} · ETA {fmtEta(j.eta)}
              </span>
            )}
            {j.is_parent && j.current_title ? (
              <span className="mono w-full truncate text-[11px] text-muted">now: {j.current_title}</span>
            ) : null}
            {j.error ? <span className="w-full truncate text-[13px] text-grease">{j.error}</span> : null}
          </div>
        </div>
      </div>
      <div
        className="h-1 bg-panel2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Download progress for ${j.title}`}
      >
        <div
          className="h-full bg-amber transition-[width] duration-300"
          style={{ width: `${j.is_parent && j.children_total ? (j.children_done / j.children_total) * 100 : pct}%` }}
        />
      </div>
      <div className="flex items-center gap-4 border-t border-hairline px-3 py-1.5">
        {live ? (
          <button onClick={onCancel} className="pressable mono inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.12em] text-muted">
            Cancel
          </button>
        ) : null}
        {j.status === "finished" && !j.is_parent ? (
          <a href={api.fileUrl(j.job_id)} download className="pressable mono inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.12em] text-amber">
            Save to this device
          </a>
        ) : null}
        {j.status === "error" && onRetry ? (
          <button onClick={onRetry} className="pressable mono inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.12em] text-amber">
            Retry from History
          </button>
        ) : null}
      </div>
    </li>
  );
}
