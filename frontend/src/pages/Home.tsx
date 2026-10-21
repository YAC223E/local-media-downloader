import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api, type AppSettings, type FormatOption, type JobInfo, type MediaInfo } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { platformKey } from "../lib/format";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import { cn } from "../lib/utils";
import { PageHeader } from "../components/PageHeader";
import { ErrorNote } from "../components/ErrorNote";
import { PlaylistCard } from "../components/PlaylistCard";
import { QualityPicker, type DownloadExtra, type QualitySelection } from "../components/QualityPicker";
import { ReadyResume } from "../components/ReadyResume";
import { RouteCard } from "../components/RouteCard";
import { SaveLink } from "../components/SaveLink";
import { PlatformMark } from "../components/PlatformMark";
import { Button } from "../components/ui/button";
import { Icon, Spinner } from "../components/ui/Icon";
import { useToast } from "../components/Toaster";

const LIVE = ["queued", "extracting", "downloading", "merging", "active"];

/** Home: paste → choose → save. The whole journey is visible before it starts. */
export function Home({ settings, onLaunched }: { settings: AppSettings | null; onLaunched: () => void }) {
  const preferredQuality = settings?.default_to_audio ? "audio" : (settings?.preferred_quality ?? "best");
  const { jobs, start, startPlaylist, cancel } = useJobs();
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
  const finishedNotSaved = job?.status === "finished" && !job.transferred;
  const downloading = starting || liveJob;
  const readyJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find((entry) => entry.status === "finished" && !entry.transferred && !entry.is_parent) ?? null,
    [jobs],
  );

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

  const fetchInfo = useCallback(
    async (raw: string) => {
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
    },
    [toast],
  );

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
        toast({ title: "Nothing new", body: "Every item is already in your Library.", tone: "info" });
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

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const text = (event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain"))
      .split(/\r?\n/)[0]
      .trim();
    if (text) void fetchInfo(text);
  };

  const title = liveJob
    ? job?.status === "queued"
      ? "Waiting to start."
      : "Downloading."
    : finishedNotSaved
      ? "Ready to save."
      : job?.status === "finished" && job.transferred
        ? `${transferText}.`
        : failedJob
          ? "That didn't work."
          : info
            ? "Choose a download."
            : "Save it to your phone.";

  const description = liveJob
    ? "The laptop is fetching this one. You can leave this page."
    : finishedNotSaved
      ? "Your file is on this laptop. Save it to this device."
      : job?.status === "finished" && job.transferred
        ? savedHere
          ? "This file is already on this phone. The laptop copy may be removed."
          : "This file was saved on another device. The laptop copy may be removed."
        : failedJob
          ? "Read the message below, then try again."
          : info?.is_playlist
            ? "New episodes only, or the whole list."
            : info
              ? "The laptop downloads this copy; then your phone can save it."
              : "Paste a link. We'll fetch it on this laptop, then hand it to your phone.";

  const showMobileBar =
    !!info &&
    !info.is_playlist &&
    !liveJob &&
    !!selection &&
    (finishedNotSaved || failedJob || !job);

  return (
    <div className={cn(showMobileBar && "pb-16 md:pb-0")}>
      <p className="sr-only" role="status" aria-live="polite">
        {fetching ? "Reading the link." : info ? `Link ready. ${info.title}. Choose a download.` : ""}
      </p>
      <PageHeader title={title} description={description} />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="grid min-w-0 content-start gap-5">
          <div
            className={cn(
              "min-w-0 rounded-card border border-line bg-surface p-3 transition-colors sm:p-4",
              dragging && "border-accent ring-2 ring-focus",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
          >
            <form onSubmit={find} className="min-w-0">
              <label htmlFor="link-input" className="sr-only">
                Video or audio link
              </label>
              <div className="flex min-w-0 items-center gap-2 rounded-field border border-line-strong bg-surface px-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-focus">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-surface2 text-brand">
                  <PlatformMark name={platformKey(info?.platform ?? "", url)} size={21} />
                </span>
                <input
                  ref={inputRef}
                  id="link-input"
                  size={1}
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (fetchError) setFetchError(null);
                    if (clipboardNote) setClipboardNote(null);
                  }}
                  placeholder={dragging ? "Drop the link here" : "Paste a video or audio link"}
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="h-[52px] min-w-0 flex-1 bg-transparent px-1 text-base text-ink placeholder:text-muted focus-visible:outline-none"
                />
                {url ? (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear link"
                    className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-[9px] text-muted hover:bg-surface2 hover:text-ink"
                  >
                    <Icon name="close" size={17} />
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={paste} className="flex-1 sm:flex-none">
                  <Icon name="paste" size={18} />
                  Paste
                </Button>
                <Button type="submit" disabled={fetching || !url.trim()} className="flex-1 sm:min-w-[136px] sm:flex-none">
                  {fetching ? <Spinner size={18} className="spin" /> : <Icon name="link" size={18} />}
                  {fetching ? "Reading…" : "Find"}
                </Button>
              </div>
            </form>

            {fetchError ? (
              <div role="alert" className="mt-3 rounded-field border border-stop/40 bg-stopwash px-3 py-2.5">
                <p className="text-[13px] font-semibold text-stop">Couldn't read that link</p>
                <ErrorNote error={fetchError} className="mt-0.5" />
              </div>
            ) : null}
            {clipboardNote ? (
              <p role="status" className="mt-2 px-1 text-[13px] leading-snug text-muted">
                {clipboardNote}
              </p>
            ) : null}

            <div className="mt-3 grid gap-1 px-1">
              <p className="text-[13px] text-muted">YouTube, TikTok, Instagram, Facebook and more.</p>
              <p className="flex items-center gap-1.5 text-[13px] text-muted">
                <Icon name="wifi" size={15} className="text-brand" />
                Stays on this laptop and your Wi-Fi.
              </p>
            </div>
          </div>

          {!info && !job && !fetching ? (
            readyJob ? (
              <ReadyResume job={readyJob} />
            ) : (
              <div className="lg:hidden">
                <RouteCard info={null} job={null} />
              </div>
            )
          ) : null}
          {fetching ? <FetchSkeleton /> : null}

          {info?.is_playlist ? (
            <PlaylistCard
              info={info}
              downloading={downloading}
              onDownload={launchPlaylist}
              headingRef={resultHeadingRef}
            />
          ) : null}

          {info && !info.is_playlist ? (
            <QualityPicker
              key={info.id}
              info={info}
              preferred={preferredQuality}
              defaultSubLang={settings?.subtitle_lang ?? "en"}
              defaultAudioQuality={settings?.audio_quality ?? "320"}
              onDownload={launchSingle}
              onSelectionChange={onSelectionChange}
              downloading={downloading}
              headingRef={resultHeadingRef}
            />
          ) : null}
        </div>

        <div
          ref={resultRef}
          className={cn("min-w-0 scroll-mt-24", !info && !job && "hidden lg:block", "lg:sticky lg:top-24 lg:self-start")}
        >
          <RouteCard
            info={info}
            job={job}
            onCancel={cancelJob}
            onDownloadAgain={
              info?.is_playlist
                ? () => launchPlaylist(false)
                : selection
                  ? () => launchSingle(selection.format, selection.extra)
                  : undefined
            }
          />
        </div>
      </div>

      {showMobileBar ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-line bg-surface px-4 py-3 shadow-float md:hidden"
          style={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            {finishedNotSaved && job ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">Ready on this laptop</p>
                  <p className="truncate text-[12px] text-muted">Save it to this device.</p>
                </div>
                <SaveLink jobId={job.job_id} size="md" className="shrink-0">
                  <Icon name="save" size={17} />
                  Save
                </SaveLink>
              </>
            ) : selection ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FetchSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface" aria-busy="true">
      <div className="flex items-center gap-3 p-4">
        <div className="shimmer h-16 w-28 shrink-0 rounded-[10px] bg-surface2" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-2/3 rounded bg-surface2" />
          <div className="mt-2 h-3 w-1/3 rounded bg-surface2" />
        </div>
      </div>
      <div className="grid gap-2 border-t border-line p-4">
        <div className="h-12 rounded-field bg-surface2" />
        <div className="h-12 rounded-field bg-surface2" />
      </div>
      <p className="sr-only" aria-live="polite">
        Reading the link…
      </p>
    </div>
  );
}
