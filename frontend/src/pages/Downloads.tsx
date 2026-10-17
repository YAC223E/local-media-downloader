import { api, type JobInfo } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { fmtBytes, fmtEta, fmtSpeed, plainError } from "../lib/format";
import { statusWord } from "../lib/status";
import { Badge, toneFor } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/StatusStrip";
import { useToast } from "../components/Toaster";

const LIVE = ["queued", "extracting", "downloading", "merging"];

/** Downloads manager: live jobs grouped Active / Finished, phone-first rows. */
export function Downloads() {
  const { jobs, loadFailed, start, refresh, cancel } = useJobs();
  const toast = useToast();
  const active = jobs.filter((j) => LIVE.includes(j.status));
  const done = jobs.filter((j) => !LIVE.includes(j.status));

  const retry = async (j: JobInfo) => {
    // The source URL lives on the History record, keyed by the same job id —
    // look it up rather than guess, then re-queue through the watched store.
    try {
      const hit = (await api.history()).find((h) => h.job_id === j.job_id);
      if (!hit) {
        toast({ title: "Entry not in History", body: "It was cleared — fetch the link again on Home.", tone: "info" });
        return;
      }
      const launched = await start({
        url: hit.url,
        format_id: "best",
        title: hit.title,
        platform: hit.platform,
        thumbnail: hit.thumbnail,
      });
      if (launched) toast({ title: "Downloading again", tone: "ok" });
    } catch {
      toast({ title: "Can't reach History", body: "The service isn't answering — check the laptop and retry.", tone: "err" });
    }
  };

  if (loadFailed && !jobs.length)
    return (
      <EmptyState
        title="Downloads are unreachable"
        body="The downloader service on this laptop isn't answering. Check that it's running, then retry."
        action={
          <Button variant="outline" onClick={() => refresh()} className="min-h-[44px]">
            Retry
          </Button>
        }
      />
    );

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
  // One value drives numerals, fill extent and aria alike — no drift.
  const fillPct = j.is_parent && j.children_total > 0 ? Math.round((j.children_done / j.children_total) * 100) : pct;
  const live = LIVE.includes(j.status);
  const done = j.status === "finished";
  // Developing-Amber rule: amber while working, fixer green when finished,
  // no wash at all for jobs that never landed anything.
  const fillTone = live ? "bg-amber" : done ? "bg-fixer" : "bg-transparent";
  const fillW = live || done ? `${fillPct}%` : "0%";
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
            <Badge tone={toneFor(j.status)}>{statusWord(j.status)}</Badge>
            <span className="mono text-[12px] text-ink">
              {j.is_parent && j.children_total > 0 ? `${j.children_done} of ${j.children_total}` : `${pct}%`}
            </span>
            {!j.is_parent && !done && live ? (
              <span className="mono text-[11px] text-muted">
                {fmtBytes(j.downloaded_bytes)} / {fmtBytes(j.total_bytes)} · {fmtSpeed(j.speed)} · ETA {fmtEta(j.eta)}
              </span>
            ) : null}
            {!j.is_parent && done ? (
              <span className="mono text-[11px] text-muted">
                Saved{fmtBytes(j.downloaded_bytes) !== "—" ? ` · ${fmtBytes(j.downloaded_bytes)}` : ""}
              </span>
            ) : null}
            {j.is_parent && j.current_title ? (
              <span className="mono w-full truncate text-[11px] text-muted">now: {j.current_title}</span>
            ) : null}
            {j.error ? <span className="line-clamp-2 w-full text-[13px] text-grease">{plainError(j.error)}</span> : null}
          </div>
        </div>
      </div>
      <div
        className="h-1 bg-panel2"
        role="progressbar"
        aria-valuenow={fillW === "0%" ? 0 : fillPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Download progress for ${j.title}`}
      >
        <div
          className={`h-full transition-[width] duration-300 ${fillTone}`}
          style={{ width: fillW }}
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
