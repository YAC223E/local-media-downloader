import { Link } from "react-router-dom";
import type { JobInfo } from "../lib/api";
import { fmtBytes, fmtEta, fmtSpeed, platformKey, platformLabel } from "../lib/format";
import { statusWord } from "../lib/status";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import { cn } from "../lib/utils";
import { ErrorNote } from "./ErrorNote";
import { Progress } from "./Progress";
import { RouteStrip } from "./RouteStrip";
import { SaveLink } from "./SaveLink";
import { PlatformMark } from "./PlatformMark";
import { Button, buttonStyles } from "./ui/button";
import { Icon } from "./ui/Icon";
import { StatusPill, toneFor } from "./ui/badge";

const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

export function JobCard({
  job,
  onCancel,
  onRetry,
  inLibrary,
}: {
  job: JobInfo;
  onCancel: (job: JobInfo) => void;
  onRetry: (job: JobInfo) => void;
  inLibrary?: boolean;
}) {
  const savedHere = useSavedOnDevice(job.job_id);
  const live = LIVE.includes(job.status);
  const finished = job.status === "finished";
  const transferred = finished && !!job.transferred;
  const failed = job.status === "error" || job.status === "cancelled";
  const transferText = transferLabel(savedHere);
  const canRetry = !!job.source_url || inLibrary === true;
  const pct = job.is_parent
    ? job.children_total
      ? (job.children_done / job.children_total) * 100
      : Math.round((job.progress ?? 0) * 100)
    : Math.round((job.progress ?? 0) * 100);
  const total = job.total_bytes ?? job.downloaded_bytes;
  const size = fmtBytes(total);

  const meta = live
    ? job.status === "queued"
      ? "Waiting for a free slot"
      : `${fmtBytes(job.downloaded_bytes)}${job.total_bytes ? ` / ${fmtBytes(job.total_bytes)}` : ""} · ${fmtSpeed(job.speed)}`
    : finished
      ? `${size}${transferred ? " · Laptop copy removed" : ""}`
      : "";

  return (
    <li className="rounded-card border border-line bg-surface p-3 sm:p-4">
      <div className="flex gap-3">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-[10px] bg-surface2 sm:h-24 sm:w-36">
          {job.thumbnail ? (
            <img src={job.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted">
              <PlatformMark name={platformKey(job.platform, job.origin)} size={22} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
            <h3 className="line-clamp-2 min-w-0 break-words text-[15px] font-bold leading-snug text-ink">{job.title || "Untitled download"}</h3>
            <span aria-live="polite" className="ml-auto shrink-0">
              <StatusPill tone={transferred ? "go" : toneFor(job.status)}>
                {transferred ? transferText : statusWord(job.status)}
              </StatusPill>
            </span>
          </div>
          <p className={cn("mt-1 text-[13px]", failed ? "text-stop" : "text-muted")}>
            {platformLabel(job.platform, job.origin)}
            {meta ? ` · ${meta}` : ""}
          </p>
          {failed ? (
            job.error ? (
              <ErrorNote error={job.error} platform={job.platform} className="mt-1.5" />
            ) : (
              <p className="mt-1.5 text-[13px] leading-snug text-muted">
                {job.status === "cancelled"
                  ? "Cancelled before the file was ready."
                  : "The download stopped before the file was ready."}
              </p>
            )
          ) : null}
          <RouteStrip step={finished ? 2 : 1} complete={transferred} error={failed} size="sm" className="mt-3" />
        </div>
      </div>

      {live ? (
        <div className="mt-3">
          {job.is_parent ? (
            <>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-ink">
                  {job.children_done} of {job.children_total} saved
                </span>
                <span className="mono text-muted">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} label="Playlist progress" />
              {job.current_title ? <p className="mt-1.5 line-clamp-1 text-[12px] text-muted">Now: {job.current_title}</p> : null}
            </>
          ) : job.status === "downloading" ? (
            <>
              <Progress value={pct} label="Download progress" />
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-muted">
                <span className="mono">{pct}%</span>
                <span className="mono">{fmtEta(job.eta)} left</span>
              </div>
            </>
          ) : job.status === "extracting" || job.status === "merging" ? (
            <Progress value={0} indeterminate label={job.status === "merging" ? "Finishing file" : "Reading link"} />
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        {live ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(job)}
            className="text-stop hover:bg-stopwash hover:text-stop"
          >
            {job.is_parent ? "Cancel all" : "Cancel"}
          </Button>
        ) : null}

        {finished && !transferred && !job.is_parent ? (
          <SaveLink jobId={job.job_id} size="sm">
            <Icon name="save" size={16} />
            Save to this device
          </SaveLink>
        ) : null}

        {failed ? (
          canRetry ? (
            <Button variant="secondary" size="sm" onClick={() => onRetry(job)}>
              <Icon name="refresh" size={16} />
              Try again
            </Button>
          ) : (
            <Link to="/" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              <Icon name="link" size={16} />
              Paste link again
            </Link>
          )
        ) : null}

        {finished && canRetry ? (
          <Button variant="ghost" size="sm" onClick={() => onRetry(job)}>
            <Icon name="refresh" size={16} />
            Download again
          </Button>
        ) : null}

        {finished && inLibrary === true ? (
          <Link to="/history" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            View in Library
          </Link>
        ) : null}

        {finished && !transferred && inLibrary === false ? (
          <span className="inline-flex min-h-[44px] items-center px-1 text-[12px] text-muted">This session only</span>
        ) : null}
      </div>
    </li>
  );
}
