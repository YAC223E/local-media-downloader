import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type HistoryItem, type JobInfo } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { JobCard } from "../components/JobCard";
import { buttonStyles, Button } from "../components/ui/button";
import { Icon, Spinner } from "../components/ui/Icon";
import { useToast } from "../components/Toaster";
import { cn } from "../lib/utils";

const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

type HistoryMap = Map<string, HistoryItem>;

/** Downloads manager: ready files first, then live work and an honest failure drawer. */
export function Downloads() {
  const { jobs, loadFailed, start, refresh, cancel } = useJobs();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<HistoryMap | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [failuresExpanded, setFailuresExpanded] = useState<boolean | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const rows = await api.history();
      setHistory(new Map(rows.map((row) => [row.job_id, row])));
      setHistoryFailed(false);
    } catch {
      setHistoryFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    const onSaved = () => void loadHistory();
    window.addEventListener("lmd:saved", onSaved);
    return () => window.removeEventListener("lmd:saved", onSaved);
  }, [loadHistory]);

  const ready = jobs
    .filter((job) => job.status === "finished" && !job.transferred && !job.is_parent)
    .reverse();
  const active = jobs.filter((job) => LIVE.includes(job.status));
  const arrived = jobs.filter((job) => job.status === "finished" && !!job.transferred).reverse();
  const finishedOther = jobs
    .filter((job) => job.status === "finished" && !job.transferred && !!job.is_parent)
    .reverse();
  const failed = jobs
    .filter((job) => job.status === "error" || job.status === "cancelled")
    .reverse();
  const hasAboveFold = ready.length + active.length + arrived.length + finishedOther.length > 0;
  const failuresOpen = failuresExpanded ?? !hasAboveFold;
  const knownHistory = history !== null;

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  };

  const retry = async (job: JobInfo) => {
    let source = job.source_url;
    let hit = history?.get(job.job_id);

    // Older jobs do not carry their source in the live payload. The Library
    // row is the honest fallback; if neither exists, ask for the link again.
    if (!source && !hit) {
      try {
        const rows = await api.history();
        const next: HistoryMap = new Map(rows.map((row) => [row.job_id, row]));
        setHistory(next);
        hit = next.get(job.job_id);
      } catch {
        toast({ title: "Can't reach Library", body: "The service isn't answering — check the laptop and retry.", tone: "err" });
        return;
      }
    }
    source = source || hit?.url;
    if (!source) {
      toast({
        title: "Original link not found",
        body: "Paste the link again on Home to start a fresh download.",
        tone: "info",
      });
      return;
    }

    const launched = await start({
      url: source,
      format_id: "best",
      title: job.title || hit?.title || "",
      platform: job.platform || hit?.platform || "Other",
      thumbnail: job.thumbnail || hit?.thumbnail || "",
    });
    if (launched) toast({ title: "Downloading again", body: "Progress is in Active.", tone: "ok" });
  };

  if (loadFailed && !jobs.length) {
    return (
      <div>
        <PageHeader title="Downloads" description="Ready files first, then live progress. You can leave this page." />
        <EmptyState
          title="Can't reach this laptop"
          body="The downloader service isn't answering. Check that it's running, then try again."
          icon="wifi"
          action={
            <Button variant="secondary" onClick={doRefresh} disabled={refreshing}>
              {refreshing ? <Spinner size={17} className="spin" /> : <Icon name="refresh" size={17} />}
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div>
        <PageHeader title="Downloads" description="Ready files first, then live progress. You can leave this page." />
        <EmptyState
          title="Nothing downloading"
          body="Files waiting for your phone will appear here — even if you switch tabs or lock your phone."
          icon="download"
          action={
            <Link to="/" className={buttonStyles({ variant: "primary", size: "md" })}>
              <Icon name="link" size={17} />
              Get a video
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Downloads"
        description="Ready files first, then live progress. You can leave this page."
        action={
          <Button variant="secondary" size="sm" onClick={doRefresh} disabled={refreshing}>
            {refreshing ? <Spinner size={16} className="spin" /> : <Icon name="refresh" size={16} />}
            Refresh
          </Button>
        }
      />

      {loadFailed ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-field border border-stop/30 bg-stopwash px-4 py-3">
          <p className="text-[14px] font-semibold text-stop">The service isn't answering. Showing the last known progress.</p>
          <Button variant="secondary" size="sm" onClick={doRefresh} disabled={refreshing}>
            Try again
          </Button>
        </div>
      ) : null}

      {historyFailed ? (
        <p className="mb-5 text-[13px] text-muted">
          Couldn't check Library. Older jobs may need their link pasted again.
        </p>
      ) : null}

      <div className="grid gap-7">
        {ready.length > 0 ? (
          <section aria-labelledby="ready-heading">
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 id="ready-heading" className="text-[18px] font-bold text-ink">
                Ready to save
              </h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-gowash px-1.5 text-[12px] font-extrabold text-go">
                {ready.length}
              </span>
            </div>
            <ol className={cn("grid gap-3", ready.length > 1 && "md:grid-cols-2")}>
              {ready.map((job) => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  inLibrary={knownHistory ? history?.has(job.job_id) : undefined}
                  onCancel={(entry) => cancel(entry.job_id)}
                  onRetry={retry}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {active.length > 0 ? (
          <section aria-labelledby="active-heading">
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 id="active-heading" className="text-[18px] font-bold text-ink">
                Active
              </h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-accent px-1.5 text-[12px] font-extrabold text-onaccent">
                {active.length}
              </span>
            </div>
            <ol className={cn("grid gap-3", active.length > 1 && "md:grid-cols-2")}>
              {active.map((job) => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  inLibrary={knownHistory ? history?.has(job.job_id) : undefined}
                  onCancel={(entry) => cancel(entry.job_id)}
                  onRetry={retry}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {arrived.length > 0 ? (
          <section aria-labelledby="arrived-heading">
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 id="arrived-heading" className="text-[18px] font-bold text-ink">
                Already saved
              </h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-gowash px-1.5 text-[12px] font-extrabold text-go">
                {arrived.length}
              </span>
            </div>
            <ol className={cn("grid gap-3", arrived.length > 1 && "md:grid-cols-2")}>
              {arrived.map((job) => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  inLibrary={knownHistory ? history?.has(job.job_id) : undefined}
                  onCancel={(entry) => cancel(entry.job_id)}
                  onRetry={retry}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {finishedOther.length > 0 ? (
          <section aria-labelledby="finished-heading">
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 id="finished-heading" className="text-[18px] font-bold text-ink">
                Finished
              </h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-surface2 px-1.5 text-[12px] font-extrabold text-muted">
                {finishedOther.length}
              </span>
            </div>
            <ol className={cn("grid gap-3", finishedOther.length > 1 && "md:grid-cols-2")}>
              {finishedOther.map((job) => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  inLibrary={knownHistory ? history?.has(job.job_id) : undefined}
                  onCancel={(entry) => cancel(entry.job_id)}
                  onRetry={retry}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {failed.length > 0 ? (
          <section aria-labelledby="failed-heading">
            <h2 id="failed-heading" className="sr-only">
              Failed downloads
            </h2>
            <details
              open={failuresOpen}
              onToggle={(event) => setFailuresExpanded(event.currentTarget.open)}
              className="group"
            >
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  Failed
                  <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-surface2 px-1.5 text-[12px] font-extrabold text-muted">
                    {failed.length}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                  <span className="group-open:hidden">Show</span>
                  <span className="hidden group-open:inline">Hide</span>
                  <Icon name="chevronDown" size={18} className="transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <ol className="mt-3 grid gap-3">
                {failed.map((job) => (
                  <JobCard
                    key={job.job_id}
                    job={job}
                    inLibrary={knownHistory ? history?.has(job.job_id) : undefined}
                    onCancel={(entry) => cancel(entry.job_id)}
                    onRetry={retry}
                  />
                ))}
              </ol>
            </details>
          </section>
        ) : null}
      </div>
    </div>
  );
}
