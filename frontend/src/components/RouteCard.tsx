import { Link } from "react-router-dom";
import type { JobInfo, MediaInfo } from "../lib/api";
import { fmtBytes, fmtEta, fmtSpeed, plainError, platformKey, platformLabel } from "../lib/format";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import { statusWord } from "../lib/status";
import { cn } from "../lib/utils";
import { ErrorDetails } from "./ErrorNote";
import { RouteStrip, type RouteStep } from "./RouteStrip";
import { Progress } from "./Progress";
import { SaveLink } from "./SaveLink";
import { PlatformMark } from "./PlatformMark";
import { Button, buttonStyles } from "./ui/button";
import { Icon } from "./ui/Icon";
import { StatusPill, toneFor } from "./ui/badge";

const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

/** The signature card: preview + three-stop route + honest progress + next action. */
export function RouteCard({
  info,
  job,
  onCancel,
  onDownloadAgain,
  className,
}: {
  info: MediaInfo | null;
  job: JobInfo | null;
  onCancel?: () => void;
  onDownloadAgain?: () => void;
  className?: string;
}) {
  const savedHere = useSavedOnDevice(job?.job_id);
  const status = job?.status ?? "";
  const live = LIVE.includes(status);
  const finished = status === "finished";
  const transferred = !!job?.transferred && finished;
  const transferText = transferLabel(savedHere);
  const failed = status === "error" || status === "cancelled";
  const hasMedia = !!(info || job);
  const title = info?.title ?? job?.title ?? "";
  const thumbnail = info?.thumbnail ?? job?.thumbnail ?? "";
  const platform = info?.platform ?? job?.platform ?? "";
  const origin = info?.webpage_url ?? job?.origin ?? "";
  const step: RouteStep = !hasMedia ? 0 : !job ? 1 : finished ? 2 : 1;

  const caption = !hasMedia
    ? "Paste a link to start. The laptop fetches it, then your phone saves it."
    : !job
      ? info?.is_playlist
        ? "Choose new episodes or the whole list, then start."
        : "Pick a quality, then start the download."
      : status === "queued"
        ? "Waiting to start on this laptop."
        : status === "extracting"
          ? "Reading the link for the download."
          : status === "downloading"
            ? "Downloading on this laptop. You can leave this page."
            : status === "merging"
              ? "Finishing the file. This can take a few minutes."
              : finished && !transferred
                ? "Ready on this laptop. Save it to this device."
                : transferred
                  ? `${transferText}. The laptop copy may be removed.`
                  : status === "cancelled"
                    ? "Download cancelled."
                    : failed
                      ? plainError(job?.error ?? "", job?.platform ?? "")
                      : "Working on this laptop.";

  const pct = job?.is_parent
    ? job.children_total
      ? (job.children_done / job.children_total) * 100
      : Math.round((job.progress ?? 0) * 100)
    : Math.round((job?.progress ?? 0) * 100);

  return (
    <section
      aria-label="Download route"
      className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}
    >
      <div className="flex min-h-[52px] items-center justify-between gap-2 border-b border-line px-4">
        <h2 className="text-[15px] font-bold text-ink">Your route</h2>
        {job ? (
          <StatusPill tone={transferred ? "go" : toneFor(status)}>{transferred ? transferText : statusWord(status)}</StatusPill>
        ) : null}
      </div>

      {hasMedia ? (
        <div className="relative aspect-video bg-surface2">
          {thumbnail ? (
            <>
              <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="line-clamp-2 text-[15px] font-bold leading-snug">{title}</p>
                {platform ? (
                  <p className="mt-1 text-[13px] text-white/75">{platformLabel(platform, origin)}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
              <PlatformMark name={platformKey(platform, origin)} size={28} />
              <p className="line-clamp-2 text-[15px] font-bold text-ink">{title}</p>
              {platform ? <p className="text-[13px] text-muted">{platformLabel(platform, origin)}</p> : null}
            </div>
          )}
        </div>
      ) : (
        <div className="border-b border-line bg-surface2/40 p-5">
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span className="grid h-12 w-12 place-items-center rounded-field bg-surface text-brand shadow-sm">
                <Icon name="laptop" size={24} />
              </span>
              <span className="text-[12px] font-semibold text-muted">Laptop fetches</span>
            </div>
            <div className="flex w-16 items-center gap-1 text-line" aria-hidden="true">
              <span className="h-px flex-1 border-t border-dashed border-current" />
              <Icon name="arrowRight" size={14} className="text-brand" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="grid h-12 w-12 place-items-center rounded-field bg-surface text-brand shadow-sm">
                <Icon name="phone" size={24} />
              </span>
              <span className="text-[12px] font-semibold text-muted">Phone saves</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <RouteStrip step={step} complete={transferred} error={failed} />
        <p aria-live="polite" className={cn("mt-4 text-[14px] leading-relaxed", failed ? "text-stop" : "text-muted")}>
          {caption}
        </p>
        {failed && job ? <ErrorDetails error={job.error} platform={job.platform} /> : null}

        {job?.is_parent && (job.children_total > 0 || job.current_title) ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="font-semibold text-ink">
                {job.children_done} of {job.children_total} saved
              </span>
              <span className="mono text-muted">{Math.round(pct)}%</span>
            </div>
            <Progress value={pct} label="Playlist progress" tone={finished ? "go" : "working"} />
            {job.current_title ? (
              <p className="mt-2 line-clamp-1 text-[13px] text-muted">Now: {job.current_title}</p>
            ) : null}
          </div>
        ) : status === "downloading" ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="mono text-ink">
                {fmtBytes(job?.downloaded_bytes)} {job?.total_bytes ? `/ ${fmtBytes(job.total_bytes)}` : ""}
              </span>
              <span className="mono text-muted">{pct}%</span>
            </div>
            <Progress value={pct} label="Download progress" />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-muted">
              <span className="mono">{fmtSpeed(job?.speed)}</span>
              <span className="mono">{fmtEta(job?.eta)} left</span>
            </div>
          </div>
        ) : status === "merging" || status === "extracting" ? (
          <Progress className="mt-4" value={0} indeterminate label={status === "merging" ? "Finishing file" : "Reading link"} />
        ) : null}

        <div className="mt-4 grid gap-2">
          {live && onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel} className="w-full text-stop hover:bg-stopwash hover:text-stop">
              Cancel download
            </Button>
          ) : null}

          {finished && !transferred && job ? (
            <SaveLink jobId={job.job_id} size="lg" className="w-full">
              <Icon name="save" size={18} />
              Save to this device
            </SaveLink>
          ) : null}

          {transferred ? (
            <div className="flex items-center justify-center gap-2 rounded-field bg-gowash px-3 py-2.5 text-[14px] font-semibold text-go">
              <Icon name="check" size={17} strokeWidth={2.4} />
              {transferText}
            </div>
          ) : null}

          {failed && onDownloadAgain ? (
            <Button variant="secondary" size="sm" onClick={onDownloadAgain} className="w-full">
              <Icon name="refresh" size={16} />
              Try again
            </Button>
          ) : null}

          {finished && onDownloadAgain ? (
            <Button variant="secondary" size="sm" onClick={onDownloadAgain} className="w-full">
              <Icon name="refresh" size={16} />
              Download again
            </Button>
          ) : null}

          {finished ? (
            <Link to="/downloads" className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full" })}>
              View all downloads
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
