import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AppSettings, type JobInfo, type MediaInfo } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { platformKey, fmtDuration } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DevelopingFrame } from "../components/DevelopingFrame";
import { FormatLedger, type DownloadExtra } from "../components/FormatLedger";
import { PlatformMark } from "../components/PlatformMark";
import { EmptyState } from "../components/StatusStrip";
import { useToast } from "../components/Toaster";

const BUSY = ["queued", "extracting", "downloading", "merging"];

/** Home: paste URL → find → download. Mobile-first: input above the fold,
 *  feedback auto-scrolls into view when a download starts. */
export function Home({ settings, onLaunched }: { settings: AppSettings | null; onLaunched: () => void }) {
  const preferredQuality = settings?.default_to_audio ? "audio" : (settings?.preferred_quality ?? "best");
  const toast = useToast();
  const { start, startPlaylist, cancel } = useJobs();
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const lastJobId = useRef<string | null>(null);

  // Progress survives navigation via the shared store; re-attach on return.
  const { jobs } = useJobs();
  useEffect(() => {
    if (lastJobId.current) {
      const live = jobs.find((j) => j.job_id === lastJobId.current);
      if (live) setJob(live);
    }
  }, [jobs]);

  // Mobile: bring feedback into view when a download starts.
  useEffect(() => {
    if (job && window.innerWidth < 1024 && frameRef.current) {
      frameRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [job?.job_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInfo = useCallback(
    async (raw: string) => {
      const target = raw.trim();
      if (!target) {
        toast({ title: "Paste a link first", body: "Copy a video or audio URL, then Find video.", tone: "info" });
        return;
      }
      setFetching(true);
      setJob(null);
      lastJobId.current = null;
      try {
        setInfo(await api.fetchInfo(target));
      } catch (e) {
        setInfo(null);
        toast({ title: "Could not read that link", body: e instanceof Error ? e.message : "Fetch failed.", tone: "err" });
      } finally {
        setFetching(false);
      }
    },
    [toast],
  );

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setUrl(text.trim());
        fetchInfo(text.trim());
      } else {
        toast({ title: "Clipboard is empty", body: "Copy a link first, then tap Paste.", tone: "info" });
      }
    } catch {
      toast({ title: "Can't reach the clipboard", body: "Paste it into the box manually.", tone: "info" });
    }
  }, [fetchInfo, toast]);

  const launchSingle = useCallback(
    async (formatId: string, extra?: DownloadExtra) => {
      if (!info) return;
      const launched = await start({
        url: info.webpage_url || url,
        format_id: formatId,
        title: info.title,
        platform: info.platform,
        thumbnail: info.thumbnail,
        audio_quality: extra?.audio_quality,
        subtitle_lang: extra?.subtitle_lang,
        needs_audio: extra?.needs_audio,
      });
      if (launched) {
        lastJobId.current = launched.job_id;
        setJob(launched);
        onLaunched();
      }
    },
    [info, url, start, onLaunched],
  );

  const launchPlaylist = useCallback(
    async (onlyNew: boolean) => {
      if (!info || !info.is_playlist) return;
      const fresh = onlyNew ? info.entries.filter((e) => !e.have_it) : info.entries.filter((e) => e.url);
      if (!fresh.length) {
        toast({ title: "Nothing new", body: "Every episode is already saved.", tone: "info" });
        return;
      }
      const launched = await startPlaylist({
        url: info.webpage_url || url,
        format_id: "best",
        title: info.title,
        platform: info.platform,
        thumbnail: info.thumbnail,
        playlist_id: info.id,
        entries: fresh,
      });
      if (launched) {
        lastJobId.current = launched.job_id;
        setJob(launched);
        onLaunched();
      }
    },
    [info, url, startPlaylist, onLaunched, toast],
  );

  const cancelJob = useCallback(async () => {
    if (!job) return;
    await cancel(job.job_id);
  }, [job, cancel]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <div className="grid content-start gap-4">
        <section aria-label="Fetch from URL" className="sleeve rounded-sm p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchInfo(url);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const text = e.dataTransfer.getData("text");
              if (text) {
                setUrl(text);
                fetchInfo(text);
              }
            }}
            className={dragOver ? "rounded-sm outline outline-2 outline-amber" : undefined}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-hairline text-amber">
                <PlatformMark name={platformKey(info?.platform ?? "", url)} />
              </span>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a video link…"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                aria-label="Video or audio URL"
                className="min-h-[52px] text-base"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button type="submit" disabled={fetching} className="min-h-[52px] flex-1 text-base sm:flex-none sm:px-8">
                {fetching ? "Finding…" : "Find video"}
              </Button>
              <Button type="button" variant="outline" onClick={paste} disabled={fetching} className="min-h-[52px] px-5" aria-label="Paste link from clipboard">
                Paste
              </Button>
              {info && (
                <span className="mono hidden truncate text-[12px] text-muted sm:block">
                  {info.platform}
                  {info.duration ? ` · ${fmtDuration(info.duration)}` : ""}
                </span>
              )}
            </div>
          </form>
        </section>

        {info && !info.is_playlist && (
          <FormatLedger
            key={`${info.id}-${info.title}`}
            formats={info.formats}
            preferred={preferredQuality}
            subtitles={info.subtitles}
            autoCaptions={info.automatic_captions}
            defaultSubLang={settings?.subtitle_lang ?? "en"}
            defaultAudioQuality={settings?.audio_quality ?? "320"}
            downloading={!!job && BUSY.includes(job.status)}
            onDownload={(f, extra) => launchSingle(f.format_id, extra)}
          />
        )}
        {info?.is_playlist && (
          <section aria-label="Episodes" className="sleeve rounded-sm">
            <header className="border-b border-hairline px-3 py-2">
              <h2 className="truncate text-sm font-bold tracking-tight text-ink">{info.title}</h2>
              <p className="mono mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted">
                {info.playlist_count} videos{info.new_count > 0 ? ` · ${info.new_count} new` : " · all saved ✓"}
              </p>
            </header>
            <ol className="max-h-[320px] overflow-y-auto">
              {info.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-b border-hairline px-3 py-2 last:border-0">
                  {e.thumbnail ? (
                    <img src={e.thumbnail} alt="" loading="lazy" className="h-10 w-[72px] shrink-0 rounded-sm object-cover" />
                  ) : (
                    <span className="grid h-10 w-[72px] shrink-0 place-items-center rounded-sm bg-panel2 text-muted">
                      <PlatformMark name={platformKey(info.platform, info.webpage_url)} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{e.title}</span>
                    <span className="mono block text-[11px] text-muted">
                      {e.duration ? fmtDuration(e.duration) : ""}
                      {e.have_it ? " · saved ✓" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="p-3">
              <Button
                className="min-h-[52px] w-full text-base"
                disabled={!!job && BUSY.includes(job.status)}
                onClick={() => launchPlaylist(true)}
              >
                {info.new_count > 0 ? `Download ${info.new_count} new` : "Download again"}
              </Button>
            </div>
          </section>
        )}
        {!info && !fetching && (
          <EmptyState title="Paste a link to start" body="YouTube, TikTok, Instagram, Facebook and more." />
        )}
        {fetching && (
          <div className="sleeve rounded-sm p-4" aria-busy="true" aria-live="polite">
            <div className="shimmer mb-3 aspect-video w-full rounded-sm bg-panel2" aria-hidden />
            <p className="mono text-[12px] uppercase tracking-[0.16em] text-muted">reading link…</p>
          </div>
        )}
        {!info && !fetching && (
          <ol aria-label="How it works" className="sleeve grid grid-cols-3 gap-2 rounded-sm p-3">
            {[
              ["M10 11l5-5 5 5M12 6v9M5 20h14", "Paste link"],
              ["M12 4v12m0 0l-5-5m5 5l5-5M4 20h16", "Download"],
              ["M7 3h10v18H7zM10 7h4", "Save"],
            ].map(([d, label]) => (
              <li key={label} className="grid justify-items-center gap-1.5 py-1 text-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={d} />
                </svg>
                <span className="text-[13px] font-semibold text-ink">{label}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid content-start gap-4" ref={frameRef} tabIndex={-1}>
        <DevelopingFrame
          thumbnail={info?.thumbnail ?? ""}
          title={info?.title ?? ""}
          frameNo={String(1).padStart(3, "0")}
          job={job}
          onCancel={cancelJob}
        />
      </div>
    </div>
  );
}
