import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { api, type AppSettings, type FormatOption, type JobInfo, type MediaInfo } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { fmtBytes } from "../lib/format";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import { useShelfData } from "../lib/shelf";
import { cn } from "../lib/utils";
import { ErrorNote } from "../components/ErrorNote";
import { PlaylistCard } from "../components/PlaylistCard";
import { QualityPicker, type DownloadExtra, type QualitySelection } from "../components/QualityPicker";
import { HandoffPanel } from "../components/HandoffPanel";
import { SaveLink } from "../components/SaveLink";
import { ShelfBoard } from "../components/ShelfBoard";
import { Progress } from "../components/Progress";
import { Button, buttonStyles } from "../components/ui/button";
import { Icon, Spinner } from "../components/ui/Icon";
import { useToast } from "../components/Toaster";

const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

/** The whole product: one shelf, one place to add a link, one place to save. */
export function Home({
  settings,
  onLaunched,
  refreshKey = 0,
}: {
  settings: AppSettings | null;
  onLaunched: () => void;
  refreshKey?: number;
}) {
  const preferredQuality = settings?.default_to_audio ? "audio" : (settings?.preferred_quality ?? "best");
  const { jobs, start, startPlaylist, cancel } = useJobs();
  const shelf = useShelfData(refreshKey);
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [selection, setSelection] = useState<QualitySelection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [clipboardNote, setClipboardNote] = useState<string | null>(null);
  const lastJobId = useRef<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const savedHere = useSavedOnDevice(job?.job_id);
  const transferText = transferLabel(savedHere);
  const liveJob = !!job && LIVE.includes(job.status);
  const failedJob = job?.status === "error" || job?.status === "cancelled";
  const arrived = job?.status === "finished" && (!!job.transferred || savedHere);
  const finishedNotSaved = job?.status === "finished" && !arrived;
  const downloading = starting || liveJob;

  useEffect(() => {
    if (!lastJobId.current) return;
    const found = jobs.find((entry) => entry.job_id === lastJobId.current);
    if (found) setJob(found);
  }, [jobs]);

  useEffect(() => {
    if (!job?.job_id) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const timer = window.setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [job?.job_id]);

  // The fetched result is the next decision point. Move focus there and let
  // the persistent live region announce what arrived.
  useEffect(() => {
    if (!info) return;
    const timer = window.setTimeout(() => resultHeadingRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [info?.id]);

  const fetchInfo = useCallback(async (raw: string) => {
    const target = raw.trim();
    if (!target) {
      setClipboardNote("Paste a link first — copy a video or audio URL, then tap Find.");
      return;
    }
    setFetching(true);
    setFetchError(null);
    setClipboardNote(null);
    setInfo(null);
    setJob(null);
    setSelection(null);
    lastJobId.current = null;
    setUrl(target);
    try {
      const found = await api.fetchInfo(target);
      setInfo(found);
      if (found.webpage_url) setUrl(found.webpage_url);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "The link didn't return a video or audio file.");
    } finally {
      setFetching(false);
    }
  }, []);

  const find = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (fetching) return;
      void fetchInfo(url);
    },
    [fetchInfo, fetching, url],
  );

  const paste = useCallback(async () => {
    setClipboardNote(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        void fetchInfo(text.trim());
      } else {
        setClipboardNote("Clipboard is empty — copy a link first, then tap Paste.");
      }
    } catch {
      setClipboardNote(
        window.isSecureContext
          ? "Can't reach the clipboard — copy the link and paste it into the box."
          : "Browsers block clipboard reading over http. Copy the link, then long-press the box and paste it.",
      );
    }
  }, [fetchInfo]);

  const launchSingle = useCallback(
    async (format: FormatOption, extra?: DownloadExtra) => {
      if (!info || starting) return;
      setStarting(true);
      try {
        const launched = await start({
          url: info.webpage_url || url,
          // The audio choice is a conversion request, not a native stream:
          // "audio:<kbps>" makes the backend produce an MP3 at that bitrate.
          format_id: extra?.audio_quality ? `audio:${extra.audio_quality}` : format.format_id,
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
      } finally {
        setStarting(false);
      }
    },
    [info, url, start, onLaunched, starting],
  );

  const launchPlaylist = useCallback(
    async (onlyNew: boolean) => {
      if (!info?.is_playlist || starting) return;
      const fresh = onlyNew ? info.entries.filter((entry) => !entry.have_it) : info.entries.filter((entry) => entry.url);
      if (!fresh.length) {
        toast({ title: "Nothing new", body: "Every item is already in your shelf list.", tone: "info" });
        return;
      }
      setStarting(true);
      try {
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
      } finally {
        setStarting(false);
      }
    },
    [info, url, startPlaylist, onLaunched, starting, toast],
  );

  const cancelJob = useCallback(async () => {
    if (!job) return;
    await cancel(job.job_id);
  }, [job, cancel]);

  const onSelectionChange = useCallback((next: QualitySelection) => setSelection(next), []);

  const clear = () => {
    setUrl("");
    setInfo(null);
    setJob(null);
    setSelection(null);
    setFetchError(null);
    setClipboardNote(null);
    lastJobId.current = null;
    inputRef.current?.focus();
  };

  const focusInput = useCallback(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), reduce ? 0 : 320);
  }, []);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const text = (event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain"))
      .split(/\r?\n/)[0]
      .trim();
    if (text) void fetchInfo(text);
  };

  const showMobileBar =
    !!info &&
    (liveJob || (info.is_playlist ? !!job : !!selection && (finishedNotSaved || failedJob || !job)));
  const pct = job?.is_parent
    ? job.children_total
      ? (job.children_done / job.children_total) * 100
      : Math.round((job.progress ?? 0) * 100)
    : Math.round((job?.progress ?? 0) * 100);
  const liveHeadline = job?.is_parent
    ? "Playlist on the laptop"
    : job?.status === "queued"
      ? "Waiting for the laptop"
      : job?.status === "extracting"
        ? "Reading the link"
        : job?.status === "merging"
          ? "Finishing the file"
          : "Fetching on the laptop";
  const liveMeta = job?.is_parent
    ? `${job.children_done} of ${job.children_total} saved`
    : `${pct}%${job?.total_bytes ? ` · ${fmtBytes(job.downloaded_bytes)} of ${fmtBytes(job.total_bytes)}` : ""}`;

  return (
    <div className={cn(showMobileBar && "pb-32 lg:pb-0")}>
      <p className="sr-only" role="status" aria-live="polite">
        {fetching ? "Reading the link." : info ? `Link ready. ${info.title}. Choose a download.` : ""}
      </p>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={drop}
      >
        <header className="shelf-hero">
          <div className="shelf-hero__copy">
            <h1 className="shelf-title">
              Your shelf<span className="text-brand">.</span>
            </h1>
            <p className="shelf-lede">
              Finished files wait here on the laptop. Save one to any phone on this Wi-Fi.
            </p>
          </div>

          <div className="shelf-stats" aria-label="Shelf status">
            <div className="shelf-stat">
              <span className="shelf-stat__n">{shelf.counts.ready}</span>
              <span className="shelf-stat__label">Ready now</span>
            </div>
            <div className="shelf-stat">
              <span className="shelf-stat__n">{shelf.counts.saved}</span>
              <span className="shelf-stat__label">On a phone</span>
            </div>
          </div>
        </header>

        <form onSubmit={find} aria-label="Add to the shelf" className="shelf-dock">
          <div className="shelf-dock__label">
            <Icon name="plus" size={18} />
            <strong>Add to the shelf</strong>
          </div>

          <div className={cn("shelf-dock__field", dragging && "is-dragging")}>
            <Icon name="link" size={20} className="shrink-0 text-muted" />
            <label htmlFor="shelf-link" className="sr-only">
              Video or audio link
            </label>
            <input
              ref={inputRef}
              id="shelf-link"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={dragging ? "Drop the link here" : "Paste a video or audio link"}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {url ? (
              <button type="button" onClick={clear} aria-label="Clear link" className="shelf-dock__clear">
                <Icon name="close" size={18} />
              </button>
            ) : null}
          </div>

          <div className="shelf-dock__actions">
            <button type="button" onClick={paste} className="shelf-dock__action">
              <Icon name="paste" size={17} />
              Paste
            </button>
            <button
              type="submit"
              disabled={fetching || !url.trim()}
              className="shelf-dock__action shelf-dock__action--go"
            >
              {fetching ? <Spinner size={17} className="spin" /> : <Icon name="download" size={17} />}
              {fetching ? "Reading" : "Fetch"}
            </button>
          </div>
        </form>

        <div aria-live="polite">
          {fetchError ? (
            <div role="alert" className="border-x border-b border-line bg-stopwash px-4 py-3">
              <p className="text-[13px] font-semibold text-stop">Couldn't read that link</p>
              <ErrorNote error={fetchError} className="mt-1" />
            </div>
          ) : null}
          {clipboardNote ? (
            <p role="status" className="border-x border-b border-line bg-surface px-4 py-3 text-[13px] leading-snug text-muted">
              {clipboardNote}
            </p>
          ) : null}
        </div>
      </div>

      {fetching ? <FetchSkeleton /> : null}

      {info ? (
        <div ref={resultRef} className="shelf-choose scroll-mt-24">
          <div className="shelf-choose__rule">
            <span>Now choose a copy</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
            <div className="min-w-0">
              {info.is_playlist ? (
                <PlaylistCard
                  info={info}
                  downloading={downloading}
                  onDownload={launchPlaylist}
                  headingRef={resultHeadingRef}
                />
              ) : (
                <QualityPicker
                  key={info.id}
                  info={info}
                  preferred={preferredQuality}
                  defaultSubLang={settings?.subtitle_lang ?? "en"}
                  defaultAudioQuality={settings?.audio_quality ?? "320"}
                  onSelectionChange={onSelectionChange}
                  headingRef={resultHeadingRef}
                />
              )}
            </div>

            <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
              <HandoffPanel
                info={info}
                job={job}
                selection={selection}
                downloading={downloading}
                onCancel={cancelJob}
                onDownload={
                  info.is_playlist
                    ? undefined
                    : selection
                      ? () => launchSingle(selection.format, selection.extra)
                      : undefined
                }
                onDownloadAgain={
                  info.is_playlist
                    ? () => launchPlaylist(false)
                    : selection
                      ? () => launchSingle(selection.format, selection.extra)
                      : undefined
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <ShelfBoard shelf={shelf} onPasteAgain={focusInput} />
      </div>

      {showMobileBar ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-3 pt-3 shadow-float lg:hidden"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-[1180px]">
            {liveJob && job ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-accentwash text-brand">
                    <Spinner size={17} className="spin" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{liveHeadline}</p>
                    <p aria-live="polite" className="mono truncate text-[11px] text-muted">
                      {liveMeta}
                    </p>
                  </div>
                  <a href="#shelf" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                    Shelf
                  </a>
                </div>
                <Progress value={pct} label={liveHeadline} className="mt-2.5" />
              </>
            ) : finishedNotSaved && job && !info.is_playlist ? (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">Ready on this laptop</p>
                  <p className="truncate text-[12px] text-muted">Save it to this device.</p>
                </div>
                <SaveLink jobId={job.job_id} size="md" className="shrink-0">
                  <Icon name="save" size={17} />
                  Save
                </SaveLink>
              </div>
            ) : info.is_playlist ? (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {failedJob ? "That didn't work." : "Playlist finished"}
                  </p>
                  <p className="truncate text-[12px] text-muted">
                    {failedJob
                      ? "Try the whole list again."
                      : `${job?.children_done ?? 0} of ${job?.children_total ?? 0} saved — save each file from the shelf.`}
                  </p>
                </div>
                {failedJob ? (
                  <Button size="md" onClick={() => launchPlaylist(false)} disabled={downloading} className="shrink-0">
                    Try again
                  </Button>
                ) : (
                  <a href="#shelf" className={buttonStyles({ variant: "secondary", size: "md" })}>
                    Shelf
                  </a>
                )}
              </div>
            ) : selection ? (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{selection.title}</p>
                  <p className="truncate text-[12px] text-muted">{selection.meta}</p>
                </div>
                <Button
                  size="md"
                  onClick={() => launchSingle(selection.format, selection.extra)}
                  disabled={downloading}
                  className="shrink-0"
                >
                  {failedJob ? "Try again" : "Download"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FetchSkeleton() {
  return (
    <div className="mt-6 overflow-hidden rounded-card border border-line bg-surface" aria-busy="true">
      <div className="flex items-center gap-4 border-b border-line p-4 sm:p-5">
        <div className="shimmer h-[72px] w-[120px] shrink-0 rounded-[8px] bg-surface2" />
        <div className="min-w-0 flex-1">
          <div className="shimmer h-3 w-1/3 rounded bg-surface2" />
          <div className="shimmer mt-2 h-4 w-2/3 rounded bg-surface2" />
          <div className="shimmer mt-2 h-3 w-1/4 rounded bg-surface2" />
        </div>
      </div>
      <div className="grid gap-2 p-4 sm:p-5">
        <div className="shimmer h-14 rounded-field bg-surface2" />
        <div className="shimmer h-14 rounded-field bg-surface2" />
        <div className="shimmer h-14 rounded-field bg-surface2" />
      </div>
      <p className="sr-only" aria-live="polite">
        Reading the link…
      </p>
    </div>
  );
}
