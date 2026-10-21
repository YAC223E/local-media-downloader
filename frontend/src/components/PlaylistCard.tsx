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
      <div className="flex items-center gap-3 border-b border-line p-4">
        <div className="h-16 w-28 shrink-0 overflow-hidden rounded-[10px] bg-surface2">
          {info.thumbnail ? (
            <img src={info.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted">
              <PlatformMark name={platformKey(info.platform, info.webpage_url)} size={24} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
            <Icon name="library" size={14} />
            Playlist
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug text-ink focus:outline-none"
          >
            {info.title}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {platformLabel(info.platform, info.webpage_url)} · {count} {count === 1 ? "item" : "items"}
            {hasNew ? ` · ${newCount} new` : " · all in Library"}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className={hasNew ? "grid gap-2 sm:grid-cols-2" : "grid"}>
          <Button
            size="lg"
            onClick={() => onDownload(hasNew)}
            disabled={downloading}
            className="w-full"
          >
            {downloading ? "Starting…" : hasNew ? `Download ${newCount} new` : "Download all again"}
          </Button>
          {hasNew ? (
            <Button variant="secondary" size="lg" onClick={() => onDownload(false)} disabled={downloading} className="w-full">
              Download all
            </Button>
          ) : null}
        </div>

        <div className="relative mt-4">
          <div className="max-h-72 overflow-auto rounded-field border border-line-strong">
            <ul aria-label="Playlist episodes" className="divide-y divide-line">
              {info.entries.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 p-2.5">
                  <div className="h-10 w-16 shrink-0 overflow-hidden rounded-[7px] bg-surface2">
                    {entry.thumbnail ? (
                      <img src={entry.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-muted">
                        <PlatformMark name={platformKey(info.platform, entry.url)} size={16} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[14px] font-semibold text-ink">{entry.title}</p>
                    <p className="text-[12px] text-muted">
                      {entry.duration ? fmtDuration(entry.duration) : "Episode"}
                    </p>
                  </div>
                  {entry.have_it ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-go">
                      <Icon name="check" size={13} strokeWidth={2.4} />
                      In Library
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          {info.entries.length > 4 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-px bottom-px h-10 rounded-b-field bg-gradient-to-t from-surface to-transparent"
            />
          ) : null}
        </div>

        {info.entries.length > 4 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
            <Icon name="chevronDown" size={13} />
            Scroll for all {count} {count === 1 ? "episode" : "episodes"}
          </p>
        ) : null}
      </div>
    </section>
  );
}
