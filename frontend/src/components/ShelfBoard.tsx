import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtBytes, fmtDay, fmtEta, fmtSpeed, plainError, platformKey, platformLabel } from "../lib/format";
import { useJobs } from "../lib/jobs";
import { transferLabel, useSavedOnDevice } from "../lib/saves";
import {
  isFailed,
  isFinishedOther,
  isReady,
  isSaved,
  isWorking,
  type ShelfData,
  type ShelfRow,
} from "../lib/shelf";
import { statusWord } from "../lib/status";
import { cn } from "../lib/utils";
import { PlatformMark } from "./PlatformMark";
import { Progress } from "./Progress";
import { SaveLink } from "./SaveLink";
import { useToast } from "./Toaster";
import { Button } from "./ui/button";
import { Icon } from "./ui/Icon";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "saved", label: "Saved" },
  { value: "failed", label: "Failed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/**
 * The shelf: one board for work in motion, files ready for a phone, and the
 * archive that used to live on separate Downloads and Library pages.
 */
export function ShelfBoard({ shelf, onPasteAgain }: { shelf: ShelfData; onPasteAgain: () => void }) {
  const toast = useToast();
  const { start, cancel } = useJobs();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmClear) {
      dialogRef.current?.showModal();
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

  useEffect(() => {
    if (!confirmClear) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [confirmClear]);

  const retry = useCallback(
    async (row: ShelfRow) => {
      if (!row.url || row.isParent) {
        onPasteAgain();
        toast({
          title: row.isParent ? "Paste the playlist link again" : "Paste the link again",
          body: row.isParent
            ? "Playlists are re-read from the link so every episode goes back on the shelf."
            : "The original link isn't on this laptop anymore. Start a fresh download above.",
          tone: "info",
        });
        return;
      }
      const launched = await start({
        url: row.url,
        format_id: "best",
        title: row.title,
        platform: row.platform,
        thumbnail: row.thumbnail,
      });
      if (launched) toast({ title: "Downloading again", body: "It's back on the shelf while it fetches.", tone: "ok" });
    },
    [onPasteAgain, start, toast],
  );

  const askRemove = (row: ShelfRow) => {
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    setConfirmId(row.jobId);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 2500);
  };

  const remove = async (row: ShelfRow) => {
    try {
      await shelf.remove(row);
      toast({ title: "Removed from the shelf", body: "The file on your devices was not touched.", tone: "ok" });
    } catch {
      toast({ title: "Couldn't remove it", body: "The service isn't answering — try again.", tone: "err" });
    } finally {
      setConfirmId(null);
    }
  };

  const clearAll = async () => {
    try {
      await shelf.clear();
      setConfirmClear(false);
      toast({ title: "Shelf cleared", body: "The record is gone. Your files stayed where they were.", tone: "ok" });
    } catch {
      toast({ title: "Couldn't clear the shelf", body: "The service isn't answering — try again.", tone: "err" });
    }
  };

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return shelf.rows;
    return shelf.rows.filter((row) =>
      `${row.title} ${platformLabel(row.platform, row.url)}`.toLowerCase().includes(search),
    );
  }, [query, shelf.rows]);

  const groups = useMemo(() => {
    const working = visible.filter(isWorking);
    const ready = visible.filter(isReady);
    const saved = visible.filter(isSaved);
    const other = visible.filter(isFinishedOther);
    const failed = visible.filter(isFailed);
    return {
      working: filter === "all" ? working : [],
      ready: filter === "all" || filter === "ready" ? ready : [],
      saved: filter === "all" || filter === "saved" ? saved : [],
      other: filter === "all" ? other : [],
      failed: filter === "all" || filter === "failed" ? failed : [],
    };
  }, [filter, visible]);

  const shown =
    groups.working.length + groups.ready.length + groups.saved.length + groups.other.length + groups.failed.length;
  const filtering = filter !== "all" || !!query.trim();

  const rowProps = { onCancel: cancel, onRetry: retry, onAskRemove: askRemove, onRemove: remove, confirmId };

  return (
    <>
      <section aria-label="The shelf" className="shelf-board" id="shelf">
        <div className="shelf-board__top">
          <div className="shelf-board__head">
            <h2 className="shelf-board__title">
              <Icon name="library" size={15} />
              On this laptop
            </h2>
            <span className="shelf-board__count">
              {[
                shelf.counts.ready ? `${shelf.counts.ready} ready` : "",
                shelf.counts.working ? `${shelf.counts.working} live` : "",
              ]
                .filter(Boolean)
                .join(" · ") || "Nothing waiting"}
            </span>
          </div>

          <div className="shelf-board__tools">
            <div className="shelf-search">
              <Icon name="search" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the shelf"
                aria-label="Search the shelf"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="shelf-search__clear"
                >
                  <Icon name="close" size={15} />
                </button>
              ) : null}
            </div>

            <div className="shelf-filters" role="group" aria-label="Filter the shelf">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className="shelf-chip"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {shelf.failed && !shelf.rows.length ? (
          <div className="shelf-empty">
            <p className="shelf-empty__title">Can't reach the shelf</p>
            <p className="shelf-empty__body">
              The downloader service isn't answering. Check that the laptop is awake, then try again.
            </p>
            <Button variant="secondary" size="sm" className="mt-5 self-start" onClick={shelf.reload}>
              <Icon name="refresh" size={15} />
              Try again
            </Button>
          </div>
        ) : shelf.loading && !shelf.rows.length ? (
          <ShelfSkeleton />
        ) : !shelf.rows.length ? (
          <div className="shelf-empty">
            <div className="shelf-empty__lips" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="shelf-empty__title">The shelf is empty.</p>
            <p className="shelf-empty__body">
              Paste a link above. The first finished file will sit here, ready to save to a phone.
            </p>
            <p className="shelf-empty__path">Laptop → Wi-Fi → Phone</p>
          </div>
        ) : !shown ? (
          <div className="shelf-empty">
            <p className="shelf-empty__title">No matches</p>
            <p className="shelf-empty__body">
              {filtering
                ? "Try a different search or filter. Nothing on the shelf fits right now."
                : "The shelf is quiet."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="shelf-clear mt-2 self-start"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {groups.ready.length ? (
              <ShelfSection title="Ready to save" tone="ready" count={groups.ready.length}>
                {groups.ready.map((row) => (
                  <ShelfItem key={row.jobId} row={row} {...rowProps} />
                ))}
              </ShelfSection>
            ) : null}

            {groups.working.length ? (
              <ShelfSection title="In motion" tone="working" count={groups.working.length}>
                {groups.working.map((row) => (
                  <ShelfItem key={row.jobId} row={row} {...rowProps} />
                ))}
              </ShelfSection>
            ) : null}

            {groups.saved.length ? (
              <ShelfSection title="On your phone" tone="saved" count={groups.saved.length}>
                {groups.saved.map((row) => (
                  <ShelfItem key={row.jobId} row={row} {...rowProps} />
                ))}
              </ShelfSection>
            ) : null}

            {groups.other.length ? (
              <ShelfSection title="Finished" tone="saved" count={groups.other.length}>
                {groups.other.map((row) => (
                  <ShelfItem key={row.jobId} row={row} {...rowProps} />
                ))}
              </ShelfSection>
            ) : null}

            {groups.failed.length ? (
              <ShelfSection title="Didn't finish" tone="failed" count={groups.failed.length}>
                {groups.failed.map((row) => (
                  <ShelfItem key={row.jobId} row={row} {...rowProps} />
                ))}
              </ShelfSection>
            ) : null}
          </>
        )}

        <div className="shelf-board__foot">
          <span>
            {shelf.counts.total
              ? `${shelf.counts.total} ${shelf.counts.total === 1 ? "item" : "items"} · ${shelf.counts.saved} on a phone`
              : "The laptop keeps the original. The phone gets a copy."}
          </span>
          {shelf.hasHistory ? (
            <button type="button" onClick={() => setConfirmClear(true)} className="shelf-clear">
              <Icon name="trash" size={13} />
              Clear list
            </button>
          ) : null}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        onCancel={() => setConfirmClear(false)}
        className="m-auto w-[min(92vw,440px)] rounded-card border border-line bg-surface p-0 text-ink shadow-float"
      >
        <div className="p-5">
          <div className="mb-4 grid h-10 w-10 place-items-center rounded-field bg-stopwash text-stop">
            <Icon name="trash" size={20} />
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Clear the shelf list?</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            This removes the archive record only. Your downloaded files stay where they are, and in-progress
            downloads keep going.
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
    </>
  );
}

function ShelfSection({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: "working" | "ready" | "saved" | "failed";
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="shelf-section" aria-label={title}>
      <div className="shelf-section__head">
        <h3 className={cn("shelf-section__label", `shelf-section__label--${tone}`)}>
          <span className="shelf-section__dot" aria-hidden="true" />
          {title}
        </h3>
        <span className="shelf-section__count">{count}</span>
      </div>
      <ul className="shelf-list">{children}</ul>
    </section>
  );
}

function ShelfItem({
  row,
  confirmId,
  onCancel,
  onRetry,
  onAskRemove,
  onRemove,
}: {
  row: ShelfRow;
  confirmId: string | null;
  onCancel: (id: string) => void;
  onRetry: (row: ShelfRow) => void;
  onAskRemove: (row: ShelfRow) => void;
  onRemove: (row: ShelfRow) => void;
}) {
  const savedHere = useSavedOnDevice(row.jobId);
  const transferText = transferLabel(savedHere);
  const working = isWorking(row);
  const ready = isReady(row);
  const saved = isSaved(row);
  const other = isFinishedOther(row);
  const failed = isFailed(row);
  const confirming = confirmId === row.jobId;
  const stamp = fmtDay(row.finishedAt ?? row.createdAt);

  const statusText = working
    ? statusWord(row.status)
    : ready
      ? "Ready"
      : saved
        ? row.transferred
          ? transferText
          : "Saved on this device"
        : other && row.isParent
          ? "Playlist"
          : other
            ? "File removed"
            : statusWord(row.status);

  return (
    <li
      className={cn(
        "shelf-row",
        working && "shelf-row--working",
        ready && "shelf-row--ready",
        saved && "shelf-row--saved",
        failed && "shelf-row--failed",
      )}
    >
      <span className="shelf-row__spine" aria-hidden="true" />

      <div className="shelf-row__thumb">
        {row.thumbnail ? (
          <img src={row.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="grid h-full w-full place-items-center" style={{ color: "var(--board-faint)" }}>
            <PlatformMark name={platformKey(row.platform, row.url)} size={17} />
          </span>
        )}
      </div>

      <div className="shelf-row__body">
        <p className="shelf-row__title">{row.title}</p>
        <p className="shelf-row__meta">
          <span>{platformLabel(row.platform, row.url)}</span>
          {row.fileSize ? <span>{fmtBytes(row.fileSize)}</span> : null}
          {stamp ? <span>{stamp}</span> : null}
          <span className="shelf-row__status">{statusText}</span>
        </p>

        {working ? (
          <>
            <p className="shelf-row__live">
              {row.isParent
                ? `${row.childrenDone} of ${row.childrenTotal} saved${row.currentTitle ? ` · ${row.currentTitle}` : ""}`
                : [
                    `${row.progress}%`,
                    row.speed ? fmtSpeed(row.speed) : "",
                    row.eta != null ? `${fmtEta(row.eta)} left` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
            <Progress
              value={row.progress}
              indeterminate={row.status === "extracting" || row.status === "merging"}
              label={`${row.title} progress`}
              className="shelf-progress"
            />
          </>
        ) : null}

        {failed && row.error ? (
          <>
            <p className="shelf-row__error">{plainError(row.error, row.platform, row.url)}</p>
            <details className="shelf-row__details">
              <summary>Details</summary>
              <p>{row.error}</p>
            </details>
          </>
        ) : null}
      </div>

      <div className="shelf-row__actions">
        {working && row.job ? (
          <button type="button" onClick={() => onCancel(row.jobId)} className="shelf-text-action shelf-text-action--stop">
            {row.isParent ? "Cancel all" : "Cancel"}
          </button>
        ) : null}

        {ready ? (
          <SaveLink jobId={row.jobId} size="sm" className="shelf-save" goneLabel="File gone">
            <Icon name="save" size={14} />
            Save
          </SaveLink>
        ) : null}

        {!working && !row.isParent ? (
          <button
            type="button"
            onClick={() => onRetry(row)}
            aria-label={`Download ${row.title} again`}
            title="Download again"
            className="shelf-icon"
          >
            <Icon name="refresh" size={15} />
          </button>
        ) : null}

        {!working && row.historyId ? (
          confirming ? (
            <button
              type="button"
              onClick={() => onRemove(row)}
              className="shelf-text-action shelf-text-action--stop"
              aria-label={`Confirm removing ${row.title} from the shelf`}
            >
              <Icon name="trash" size={14} />
              Remove?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAskRemove(row)}
              aria-label={`Remove ${row.title} from the shelf list`}
              title="Remove from the list"
              className="shelf-icon shelf-icon--stop"
            >
              <Icon name="trash" size={15} />
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

function ShelfSkeleton() {
  return (
    <div aria-busy="true">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex items-center gap-3 border-t px-4 py-4" style={{ borderColor: "var(--board-line-soft)" }}>
          <span className="h-12 w-[3px] shrink-0" style={{ background: "var(--board-edge)" }} />
          <span className="h-12 w-12 shrink-0 animate-pulse" style={{ background: "var(--board-raised)" }} />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-2/3 animate-pulse" style={{ background: "var(--board-raised)" }} />
            <div className="mt-2 h-2.5 w-1/3 animate-pulse" style={{ background: "var(--board-raised)" }} />
          </div>
        </div>
      ))}
      <p className="sr-only" aria-live="polite">
        Reading the shelf.
      </p>
    </div>
  );
}
