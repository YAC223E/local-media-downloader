import type { Ref } from "react";
import type { MediaInfo } from "../lib/api";
import { fmtDuration, platformKey, platformLabel } from "../lib/format";
import { Button } from "./ui/button";
import { Icon } from "./ui/Icon";
import { PlatformMark } from "./PlatformMark";

export function PlaylistCard({
  info,
  downloading,
  onDownload,
  headingRef,
}: {
  info: MediaInfo;
  downloading: boolean;
  onDownload: (onlyNew: boolean) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const count = info.playlist_count ?? info.entries.length;
  const newCount = info.new_count;
  const hasNew = newCount > 0;

  return (
    <section aria-label="Playlist" className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex gap-4 border-b border-line p-4 sm:p-5">
        <div className="h-[72px] w-[120px] shrink-0 overflow-hidden rounded-[8px] bg-surface2">
          {info.thumbnail ? (
            <img src={info.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted">
              <PlatformMark name={platformKey(info.platform, info.webpage_url)} size={24} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] font-semibold text-muted">
            <Icon name="library" size={14} />
            <span>Playlist</span>
            <span aria-hidden="true">·</span>
            <span>{platformLabel(info.platform, info.webpage_url)}</span>
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-ink focus:outline-none sm:text-[19px]"
          >
            {info.title}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {count} {count === 1 ? "item" : "items"}
            {hasNew ? ` · ${newCount} new` : " · all on the shelf"}
          </p>
        </div>
      </div>

      <div className="border-b border-line p-4 sm:p-5">
        <div className={hasNew ? "grid gap-2 sm:grid-cols-2" : "grid"}>
          <Button size="lg" onClick={() => onDownload(hasNew)} disabled={downloading} className="w-full">
            {downloading ? "Starting…" : hasNew ? `Download ${newCount} new` : "Download all again"}
          </Button>
          {hasNew ? (
            <Button variant="secondary" size="lg" onClick={() => onDownload(false)} disabled={downloading} className="w-full">
              Download all
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-[13px] text-muted">The laptop downloads them. Save each file to your phone when it's ready.</p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="max-h-72 overflow-auto rounded-field border border-line">
          <ul aria-label="Playlist episodes" className="divide-y divide-line">
            {info.entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 p-2.5">
                <div className="h-10 w-16 shrink-0 overflow-hidden rounded-[6px] bg-surface2">
                  {entry.thumbnail ? (
                    <img src={entry.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-muted">
                      <PlatformMark name={platformKey(info.platform, entry.url)} size={16} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13px] font-semibold text-ink">{entry.title}</p>
                  <p className="mono text-[11px] text-muted">
                    {entry.duration ? fmtDuration(entry.duration) : "Episode"}
                  </p>
                </div>
                {entry.have_it ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-go">
                    <Icon name="check" size={13} strokeWidth={2.3} />
                    On shelf
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        {info.entries.length > 4 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
            <Icon name="chevronDown" size={13} />
            Scroll for all {count} {count === 1 ? "episode" : "episodes"}
          </p>
        ) : null}
      </div>
    </section>
  );
}
