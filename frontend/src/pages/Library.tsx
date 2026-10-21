import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type HistoryItem } from "../lib/api";
import { fmtBytes, fmtDay, platformKey, platformLabel } from "../lib/format";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import { statusWord } from "../lib/status";
import { cn } from "../lib/utils";
import { useJobs } from "../lib/jobs";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { ErrorNote } from "../components/ErrorNote";
import { SearchInput } from "../components/SearchInput";
import { PlatformMark } from "../components/PlatformMark";
import { SaveLink } from "../components/SaveLink";
import { Button, buttonStyles } from "../components/ui/button";
import { Icon } from "../components/ui/Icon";
import { Segmented } from "../components/ui/segmented";
import { StatusPill } from "../components/ui/badge";
import { useToast } from "../components/Toaster";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "finished", label: "Ready" },
  { value: "failed", label: "Failed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/** Survives route remounts so returning to Library never flashes empty. */
let cache: HistoryItem[] = [];

function isFailed(item: HistoryItem): boolean {
  return item.status === "error" || item.status === "cancelled";
}

function stamp(item: HistoryItem): string {
  return fmtDay(item.finished_at ?? item.created_at);
}

/** Library: search, filter, save again, re-download, or remove archive rows. */
export function Library({ refreshKey }: { refreshKey: number }) {
  const toast = useToast();
  const { start, jobs } = useJobs();
  const [items, setItems] = useState<HistoryItem[]>(cache);
  const [loading, setLoading] = useState(cache.length === 0);
  const [failed, setFailed] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (quiet: boolean) => {
    if (!quiet) setLoading(true);
    try {
      const next = await api.history();
      cache = next;
      setItems(next);
      setFailed(false);
    } catch {
      if (!itemsRef.current.length) setFailed(true);
      // A quiet refresh keeps the visible rows; the honest ones stay on screen.
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(cache.length > 0);
  }, [load, refreshKey]);

  useEffect(() => {
    const onSaved = () => void load(true);
    window.addEventListener("lmd:saved", onSaved);
    return () => window.removeEventListener("lmd:saved", onSaved);
  }, [load]);

  const finishedCount = jobs.filter((job) => job.status === "finished").length;
  useEffect(() => {
    if (!finishedCount) return;
    const timer = window.setTimeout(() => void load(true), 700);
    return () => window.clearTimeout(timer);
  }, [finishedCount, load]);

  useEffect(() => {
    if (confirmClear) {
      dialogRef.current?.showModal();
      // Momentum rests on not destroying things: focus the safe action.
      keepRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [confirmClear]);

  useEffect(
    () => () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  const queueAgain = async (item: HistoryItem) => {
    const launched = await start({
      url: item.url,
      format_id: "best",
      title: item.title,
      platform: item.platform,
      thumbnail: item.thumbnail,
    });
    if (launched) toast({ title: "Downloading again", body: "Progress is in Downloads.", tone: "ok" });
  };

  const removeOne = async (id: number) => {
    try {
      await api.deleteEntry(id);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        cache = next;
        return next;
      });
      toast({ title: "Removed from Library", tone: "ok" });
    } catch {
      toast({ title: "Couldn't delete", body: "The service isn't answering — try again.", tone: "err" });
    } finally {
      setConfirmId(null);
    }
  };

  // Two-step arm/delete: first tap asks for 2.5s, second disposes.
  const askRemove = (id: number) => {
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    setConfirmId(id);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 2500);
  };

  const clearAll = async () => {
    try {
      await api.clearHistory();
      cache = [];
      setItems([]);
      setConfirmClear(false);
      toast({ title: "Library cleared", body: "The files on your devices were not touched.", tone: "ok" });
    } catch {
      toast({ title: "Couldn't clear Library", body: "The service isn't answering — try again.", tone: "err" });
    }
  };

  const visible = items.filter((item) => {
    if (filter === "finished" && item.status !== "finished") return false;
    if (filter === "failed" && !isFailed(item)) return false;
    const search = query.trim().toLowerCase();
    if (search) {
      const haystack = `${item.title} ${platformLabel(item.platform, item.url)}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  if (loading && !items.length) {
    return (
      <div>
        <PageHeader title="Library" description="Everything you've fetched to this laptop. Save anything again." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <LibrarySkeleton key={n} />
          ))}
        </div>
      </div>
    );
  }

  if (failed && !items.length) {
    return (
      <div>
        <PageHeader title="Library" description="Everything you've fetched to this laptop. Save anything again." />
        <EmptyState
          title="Can't reach your Library"
          body="The downloader service isn't answering. Check that it's running, then try again."
          icon="wifi"
          action={
            <Button variant="secondary" onClick={() => load(false)}>
              <Icon name="refresh" size={17} />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div>
        <PageHeader title="Library" description="Everything you've fetched to this laptop. Save anything again." />
        <EmptyState
          title="Your Library is empty"
          body="Finished videos and songs will land here. Start with a link on Home."
          icon="library"
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
        title="Library"
        description="Everything you've fetched to this laptop. Save anything again."
        action={
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} className="text-stop hover:bg-stopwash hover:text-stop">
            <Icon name="trash" size={16} />
            Clear list
          </Button>
        }
      />

      {failed ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-field border border-stop/30 bg-stopwash px-4 py-3">
          <p className="text-[14px] font-semibold text-stop">The service isn't answering. Showing the last known Library.</p>
          <Button variant="secondary" size="sm" onClick={() => load(true)}>
            Try again
          </Button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search titles"
          label="Search Library titles"
          className="w-full sm:max-w-sm"
        />
        <Segmented
          label="Filter Library"
          options={FILTERS.map((option) => ({ value: option.value, label: option.label }))}
          value={filter}
          onChange={setFilter}
          fullWidth
          className="sm:ml-auto sm:w-auto"
        />
      </div>

      {visible.length ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              confirming={confirmId === item.id}
              onQueueAgain={() => queueAgain(item)}
              onAskRemove={() => askRemove(item.id)}
              onRemove={() => removeOne(item.id)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No matches"
          body="Try a different search or filter."
          icon="search"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      <dialog
        ref={dialogRef}
        onCancel={() => setConfirmClear(false)}
        className="m-auto w-[min(92vw,430px)] rounded-card border border-line bg-surface p-0 text-ink"
      >
        <div className="p-5">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-field bg-stopwash text-stop">
            <Icon name="trash" size={22} />
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-ink">Clear your Library?</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            This removes the list only. Your downloaded files stay where they are.
          </p>
          <div className="mt-5 flex gap-2">
            <Button ref={keepRef} variant="secondary" onClick={() => setConfirmClear(false)} className="flex-1">
              Keep list
            </Button>
            <Button variant="danger" onClick={clearAll} className="flex-1">
              Clear list
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function LibraryCard({
  item,
  confirming,
  onQueueAgain,
  onAskRemove,
  onRemove,
}: {
  item: HistoryItem;
  confirming: boolean;
  onQueueAgain: () => void;
  onAskRemove: () => void;
  onRemove: () => void;
}) {
  const savedHere = useSavedOnDevice(item.job_id);
  const finished = item.status === "finished";
  const transferred = !!item.transferred;
  const transferText = transferLabel(savedHere);
  const failed = isFailed(item);
  const parent = !!item.is_parent;

  return (
    <li className="flex flex-col rounded-card border border-line bg-surface p-3 md:overflow-hidden md:p-0">
      <div className="flex gap-3 md:block">
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[10px] bg-surface2 md:h-auto md:w-full md:rounded-none md:aspect-video">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-muted">
              <PlatformMark name={platformKey(item.platform, item.url)} size={24} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 md:p-4">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink">{item.title || "Untitled media"}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <PlatformMark name={platformKey(item.platform, item.url)} size={14} />
              {platformLabel(item.platform, item.url)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{stamp(item)}</span>
            {item.file_size ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="mono">{fmtBytes(item.file_size)}</span>
              </>
            ) : null}
          </div>

          {parent && item.children_total ? (
            <p className="mt-1.5 text-[13px] text-muted">
              {item.children_done} of {item.children_total} saved
            </p>
          ) : null}

          {failed && item.error ? (
            <ErrorNote error={item.error} platform={item.platform} url={item.url} className="mt-2" />
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusPill tone={transferred ? "go" : failed ? "stop" : finished ? "go" : "muted"}>
              {transferred ? transferText : statusWord(item.status)}
            </StatusPill>
            {transferred ? (
              <span className="text-[13px] font-medium text-muted">Laptop copy removed.</span>
            ) : finished && !parent && !item.file_path ? (
              <span className="text-[13px] font-medium text-muted">File removed from this laptop</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 md:mt-auto md:px-4 md:pb-4">
        {finished && !transferred && !parent && item.file_path ? (
          <SaveLink jobId={item.job_id} size="sm">
            <Icon name="save" size={15} />
            Save
          </SaveLink>
        ) : null}

        {!parent ? (
          <Button variant="ghost" size="sm" onClick={onQueueAgain}>
            <Icon name="refresh" size={15} />
            {failed ? "Try again" : "Download again"}
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          onClick={confirming ? onRemove : onAskRemove}
          aria-label={confirming ? `Confirm removing ${item.title} from Library` : `Remove ${item.title} from Library`}
          className={cn("ml-auto text-muted", confirming && "text-stop hover:bg-stopwash hover:text-stop")}
        >
          <Icon name="trash" size={15} />
          {confirming ? "Remove?" : "Remove"}
        </Button>
      </div>
    </li>
  );
}

function LibrarySkeleton() {
  return (
    <div className="flex flex-col rounded-card border border-line bg-surface p-3 md:overflow-hidden md:p-0" aria-busy="true">
      <div className="flex gap-3 md:block">
        <div className="shimmer h-20 w-28 shrink-0 rounded-[10px] bg-surface2 md:h-auto md:w-full md:aspect-video md:rounded-none" />
        <div className="min-w-0 flex-1 md:p-4">
          <div className="h-4 w-3/4 rounded bg-surface2" />
          <div className="mt-2 h-3 w-1/2 rounded bg-surface2" />
          <div className="mt-4 h-7 w-24 rounded-pill bg-surface2" />
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-line pt-3 md:mt-auto md:px-4 md:pb-4">
        <div className="h-8 w-20 rounded-button bg-surface2" />
        <div className="h-8 w-28 rounded-button bg-surface2" />
      </div>
    </div>
  );
}
