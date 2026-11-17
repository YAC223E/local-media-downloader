import type { JobInfo, MediaInfo } from "../lib/api";
import { fmtBytes, fmtEta, fmtSpeed, plainError } from "../lib/format";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import { statusWord } from "../lib/status";
import { cn } from "../lib/utils";
import { ErrorDetails } from "./ErrorNote";
import { HandoffRail, type HandoffState } from "./HandoffRail";
import { Progress } from "./Progress";
import { SaveLink } from "./SaveLink";
import { Button, buttonStyles } from "./ui/button";
import { Icon } from "./ui/Icon";
import { StatusPill, toneFor } from "./ui/badge";
import type { QualitySelection } from "./QualityPicker";

const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

/** The one place where the next action lives: hand the file from laptop to phone. */
export function HandoffPanel({
  info,
  job,
  selection,
  downloading,
  onDownload,
  onDownloadAgain,
  onCancel,
  className,
}: {
  info: MediaInfo | null;
  job: JobInfo | null;
  selection: QualitySelection | null;
  downloading: boolean;
  onDownload?: () => void;
  onDownloadAgain?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const savedHere = useSavedOnDevice(job?.job_id);
  const status = job?.status ?? "";
  const live = LIVE.includes(status);
  const finished = status === "finished";
  const transferred = finished && !!job?.transferred;
  const arrived = transferred || (finished && savedHere);
  const failed = status === "error" || status === "cancelled";
  const transferText = transferLabel(savedHere);
  const handoff: HandoffState = arrived
    ? "arrived"
    : finished
      ? "ready"
      : live
        ? "fetching"
        : failed
          ? "failed"
          : "idle";

  const caption = live
    ? status === "queued"
      ? "Waiting for a free slot on the laptop."
      : status === "extracting"
        ? "Reading the link for the download."
        : status === "merging"
          ? "Finishing the file on the laptop. This can take a few minutes."
          : "The laptop is fetching the file. You can leave this page."
    : finished && !arrived
      ? "The file is on this laptop. Save it to this device to finish."
      : arrived
        ? savedHere
          ? transferred
            ? "On your phone. The laptop copy may be removed."
            : "On your phone. The laptop keeps its copy."
          : transferred
            ? "Saved to a phone. The laptop copy may be removed."
            : "Saved to a phone."
        : failed
          ? plainError(job?.error ?? "", job?.platform ?? "")
          : info?.is_playlist
            ? "Choose new episodes or the whole list."
            : "Download this copy to the laptop, then save it to your phone.";

  const pct = job?.is_parent
    ? job.children_total
      ? (job.children_done / job.children_total) * 100
      : Math.round((job.progress ?? 0) * 100)
    : Math.round((job?.progress ?? 0) * 100);

  return (
    <aside
      aria-label="Handoff"
      className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}
    >
      <div className="flex min-h-14 items-center justify-between gap-2 border-b border-line px-5">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">Handoff</h2>
        {job ? (
          <span aria-live="polite">
            <StatusPill tone={arrived ? "go" : toneFor(status)}>
              {arrived ? transferText : statusWord(status)}
            </StatusPill>
          </span>
        ) : (
          <span className="mono text-[11px] uppercase tracking-[0.12em] text-faint">Not started</span>
        )}
      </div>

      <div className="p-5">
        <HandoffRail state={handoff} />

        <p
          aria-live="polite"
          className={cn("mt-4 text-[13px] leading-relaxed", failed ? "text-stop" : "text-muted")}
        >
          {caption}
        </p>
        {failed && job ? <ErrorDetails error={job.error} platform={job.platform} /> : null}

        {job?.is_parent && (job.children_total > 0 || job.current_title) ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px]">
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
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px]">
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

        {!info?.is_playlist && selection ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mono text-[11px] uppercase tracking-[0.12em] text-muted">Selected copy</p>
            <p className="mt-1 text-[14px] font-semibold text-ink">{selection.title}</p>
            <p className="mono mt-0.5 text-[12px] leading-relaxed text-muted">{selection.meta}</p>
          </div>
        ) : info?.is_playlist ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mono text-[11px] uppercase tracking-[0.12em] text-muted">Playlist</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {info.new_count > 0
                ? `${info.new_count} new ${info.new_count === 1 ? "item" : "items"} · ${info.playlist_count ?? info.entries.length} total`
                : `${info.playlist_count ?? info.entries.length} items · all on your shelf`}
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          {!job && !info?.is_playlist && selection && onDownload ? (
            <Button size="lg" onClick={onDownload} disabled={downloading} className="hidden w-full lg:flex">
              {downloading ? "Starting…" : "Download on this laptop"}
            </Button>
          ) : null}

          {live && onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel} className="w-full text-stop hover:bg-stopwash hover:text-stop">
              Cancel download
            </Button>
          ) : null}

          {finished && !arrived && job && !job.is_parent ? (
            <SaveLink jobId={job.job_id} size="lg" className="hidden w-full lg:inline-flex">
              <Icon name="save" size={18} />
              Save to this device
            </SaveLink>
          ) : null}

          {arrived ? (
            <div className="flex items-center gap-3 rounded-field border border-go/30 bg-gowash px-3.5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-go text-ground">
                <Icon name="check" size={16} strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-go">{transferText}</p>
                <p className="text-[12px] leading-snug text-go">
                  {transferred ? "The handoff is complete." : "The file is saving to this device."}
                </p>
              </div>
            </div>
          ) : null}

          {failed && onDownloadAgain ? (
            <Button variant="secondary" size="sm" onClick={onDownloadAgain} className="hidden w-full lg:flex">
              <Icon name="refresh" size={16} />
              Try again
            </Button>
          ) : null}

          {finished && onDownloadAgain ? (
            <Button variant="ghost" size="sm" onClick={onDownloadAgain} className="w-full">
              <Icon name="refresh" size={16} />
              Download again
            </Button>
          ) : null}

          {job ? (
            <a href="#shelf" className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full" })}>
              View the shelf
            </a>
          ) : !info?.is_playlist ? (
            <p className="mt-1 text-center text-[12px] leading-relaxed text-faint">
              The laptop keeps working if you leave this page.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
