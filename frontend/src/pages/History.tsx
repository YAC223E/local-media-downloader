import { useCallback, useEffect, useRef, useState } from "react";
import { api, type HistoryItem } from "../lib/api";
import { fmtBytes, fmtDay, platformKey, plainError } from "../lib/format";
import { statusWord } from "../lib/status";
import { PlatformMark } from "../components/PlatformMark";
import { Badge, toneFor } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EmptyState } from "../components/StatusStrip";
import { useToast } from "../components/Toaster";
import { useJobs } from "../lib/jobs";

/** Survives route remounts so returning to History never flashes empty. */
let cache: HistoryItem[] = [];

/** Date stamp for the card meta: finished time the engine recorded, else created. */
function stamp(it: HistoryItem): string {
  return fmtDay(it.finished_at ?? it.created_at);
}

/** History archive: filter by status, search titles, re-download, delete.
 *  Known rows render instantly and refresh silently; only a cold, evidence-less
 *  page shows a skeleton or (if the server is unreachable) an error state. */
export function History({ refreshKey }: { refreshKey: number }) {
  const toast = useToast();
  const { start } = useJobs();
  const [items, setItems] = useState<HistoryItem[]>(cache);
  const [loading, setLoading] = useState(cache.length === 0);
  const [failed, setFailed] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [filter, setFilter] = useState<"all" | "finished" | "failed">("all");
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    load(cache.length > 0);
  }, [load, refreshKey]);

  useEffect(() => {
    if (confirmClear) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [confirmClear]);

  const queueAgain = async (it: HistoryItem) => {
    // Through the shared store so the job is watched (Downloads + badge update live).
    const launched = await start({
      url: it.url,
      format_id: "best",
      title: it.title,
      platform: it.platform,
      thumbnail: it.thumbnail,
    });
    if (launched) toast({ title: "Downloading again", tone: "ok" });
  };
  const removeOne = async (id: number) => {
    try {
      await api.deleteEntry(id);
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        cache = next;
        return next;
      });
    } catch {
      toast({ title: "Couldn't delete", body: "The service isn't answering — try again.", tone: "err" });
    } finally {
      setConfirmId(null);
    }
  };
  // Two-step arm/delete: the first tap asks for 2.5s, the second disposes —
  // no dialog detour for an everyday mistake-reversible act.
  const askRemove = (id: number) => {
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    setConfirmId(id);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 2500);
  };
  const clearAll = async () => {
    await api.clearHistory();
    cache = [];
    setItems([]);
    setConfirmClear(false);
  };

  const visible = items.filter((it) => {
    if (filter === "finished" && it.status !== "finished") return false;
    if (filter === "failed" && it.status !== "error") return false;
    if (query.trim() && !it.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  if (loading && !items.length) return <HistorySkeleton />;

  if (failed && !items.length)
    return (
      <EmptyState
        title="History is unreachable"
        body="The downloader service on this laptop isn't answering. Check that it's running, then retry."
        action={
          <Button variant="outline" onClick={() => load(false)} className="min-h-[44px]">
            Retry
          </Button>
        }
      />
    );

  if (!items.length)
    return <EmptyState title="Nothing here yet" body="Finished videos will appear here." />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-sm border border-hairline" role="group" aria-label="Filter by status">
          {(["all", "finished", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`pressable mono min-h-[44px] px-3 text-[12px] uppercase tracking-[0.12em] ${
                filter === f ? "bg-[var(--wash)] text-ink" : "text-muted"
              }`}
            >
              {f === "all" ? "All" : f === "finished" ? "Done" : "Failed"}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles…"
          aria-label="Search history titles"
          className="min-h-[44px] min-w-0 flex-1"
        />
        <Button variant="ghost" onClick={() => setConfirmClear(true)} className="h-11 text-[13px]">
          Clear
        </Button>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No matches" body="Try a different search or filter." />
      ) : (
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((it) => (
            <li key={it.id} className="sleeve frame-ticks overflow-hidden rounded-sm">
              <div className="relative aspect-video w-full overflow-hidden bg-panel2">
                {it.thumbnail ? (
                  <img src={it.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-muted">
                    <PlatformMark name={platformKey(it.platform, it.url)} />
                  </span>
                )}
                {it.is_parent ? (
                  <span className="mono absolute left-2 top-2 bg-black/65 px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-[#f5efe0]">
                    {it.children_done}/{it.children_total} saved
                  </span>
                ) : null}
              </div>
              <div className="grid gap-1.5 p-2.5">
                <p className="line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-snug text-ink">{it.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Badge tone={toneFor(it.status)}>{statusWord(it.status)}</Badge>
                  {stamp(it) && <span className="mono text-[11px] text-muted">{stamp(it)}</span>}
                  <span className="mono text-[11px] text-muted">{it.platform}</span>
                  <span className="mono min-w-0 text-[11px] text-muted">{fmtBytes(it.file_size)}</span>
                </div>
                {it.error && <p className="line-clamp-2 text-[12px] text-grease">{plainError(it.error)}</p>}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {it.is_parent ? (
                    <span className="mono text-[12px] uppercase tracking-[0.12em] text-muted">
                      {it.children_done} of {it.children_total} saved
                    </span>
                  ) : it.status === "finished" && it.file_path ? (
                    <a href={api.fileUrl(it.job_id)} className="pressable mono inline-flex min-h-[44px] items-center whitespace-nowrap text-[13px] uppercase tracking-[0.12em] text-amber hover:underline" download>
                      Save to this device
                    </a>
                  ) : it.status === "finished" && it.transferred ? (
                    <span className="mono text-[12px] uppercase tracking-[0.12em] text-fixer">✓ On your device</span>
                  ) : null}
                  {!it.is_parent ? (
                    <button onClick={() => queueAgain(it)} className="pressable mono inline-flex min-h-[44px] items-center whitespace-nowrap text-[13px] uppercase tracking-[0.12em] text-muted hover:text-amber">
                      Download again
                    </button>
                  ) : null}
                  {confirmId === it.id ? (
                    <button
                      onClick={() => removeOne(it.id)}
                      className="pressable mono inline-flex min-h-[44px] items-center whitespace-nowrap text-[13px] uppercase tracking-[0.12em] text-grease"
                    >
                      Sure?
                    </button>
                  ) : (
                    <button onClick={() => askRemove(it.id)} aria-label={`Delete ${it.title}`} className="pressable mono ml-auto inline-flex min-h-[44px] items-center whitespace-nowrap text-[13px] uppercase tracking-[0.12em] text-muted hover:text-grease">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby="clear-title"
        onClose={() => setConfirmClear(false)}
        className="w-[min(92vw,380px)] rounded-sm border border-hairline bg-panel p-5 text-ink backdrop:bg-black/70"
      >
        <h2 id="clear-title" className="text-[15px] font-bold">Clear the whole list?</h2>
        <p className="mt-1 text-sm text-muted">Saved files stay where they are. This only clears the list.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={clearAll} className="min-h-[48px] flex-1">
            Clear list
          </Button>
          <Button variant="outline" autoFocus onClick={() => setConfirmClear(false)} className="min-h-[48px] flex-1">
            Keep it
          </Button>
        </div>
      </dialog>
    </div>
  );
}

/** First-load skeleton shaped like the archive itself — the contact grid, latent. */
function HistorySkeleton() {
  return (
    <ol className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading history">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="sleeve overflow-hidden rounded-sm">
          <div className="shimmer aspect-video w-full bg-panel2" aria-hidden />
          <div className="grid gap-1.5 p-2.5">
            <div className="shimmer h-3.5 w-4/5 rounded-sm bg-panel2" aria-hidden />
            <div className="shimmer h-3 w-2/5 rounded-sm bg-panel2" aria-hidden />
          </div>
        </li>
      ))}
    </ol>
  );
}
