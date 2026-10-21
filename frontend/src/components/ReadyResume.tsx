import { Link } from "react-router-dom";
import type { JobInfo } from "../lib/api";
import { fmtBytes, platformLabel } from "../lib/format";
import { platformKey } from "../lib/format";
import { buttonStyles } from "./ui/button";
import { Icon } from "./ui/Icon";
import { PlatformMark } from "./PlatformMark";
import { RouteStrip } from "./RouteStrip";
import { SaveLink } from "./SaveLink";

/** A returning Home visitor's next action: the file already waiting on the laptop. */
export function ReadyResume({ job }: { job: JobInfo }) {
  const size = fmtBytes(job.total_bytes ?? job.downloaded_bytes);
  return (
    <section aria-labelledby="ready-resume-title" className="rounded-card border border-line bg-surface p-4">
      <div className="flex gap-3">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-[10px] bg-surface2">
          {job.thumbnail ? (
            <img src={job.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted">
              <PlatformMark name={platformKey(job.platform, job.origin)} size={24} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-go">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            Ready on this laptop
          </p>
          <h2 id="ready-resume-title" className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-ink">
            {job.title || "Untitled download"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {platformLabel(job.platform, job.origin)}
            {size !== "—" ? ` · ${size}` : ""}
          </p>
        </div>
      </div>

      <RouteStrip step={2} size="sm" className="mt-4" />
      <p className="mt-3 text-[13px] leading-snug text-muted">The laptop has the file. Save it to this device.</p>

      <div className="mt-3 grid gap-2 sm:flex">
        <SaveLink jobId={job.job_id} size="md" className="flex-1">
          <Icon name="save" size={17} />
          Save to this device
        </SaveLink>
        <Link to="/downloads" className={buttonStyles({ variant: "ghost", size: "md", className: "flex-1" })}>
          All downloads
        </Link>
      </div>
    </section>
  );
}
