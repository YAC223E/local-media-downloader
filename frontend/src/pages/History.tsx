import { useCallback, useEffect, useRef, useState } from "react";
import { api, type HistoryItem } from "../lib/api";
import { fmtBytes } from "../lib/format";
import { platformKey } from "../lib/format";
import { PlatformMark } from "../components/PlatformMark";
import { Badge, toneFor } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EmptyState } from "../components/StatusStrip";
import { useToast } from "../components/Toaster";

/** History archive: filter by status, search titles, re-download, delete. */
export function History({ refreshKey }: { refreshKey: number }) {
  const toast = useToast();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "finished" | "failed">("all");
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.history());
    } catch (e) {
      toast({ title: "History unavailable", body: e instanceof Error ? e.message : "Load failed.", tone: "err" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (confirmClear) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [confirmClear]);

  const queueAgain = async (it: HistoryItem) => {
    try {
      await api.start({ url: it.url, format_id: "best", title: it.title, platform: it.platform, thumbnail: it.thumbnail });
      toast({ title: "Downloading again", tone: "ok" });
    } catch (e) {
      toast({ title: "Could not start", body: e instanceof Error ? e.message : "Start failed.", tone: "err" });
    }
  };
  const removeOne = async (id: number) => {
    await api.deleteEntry(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };
  const clearAll = async () => {
    await api.clearHistory();
    setItems([]);
    setConfirmClear(false);
  };

  const visible = items.filter((it) => {
    if (filter === "finished" && it.status !== "finished") return false;
    if (filter === "failed" && it.status !== "error") return false;
    if (query.trim() && !it.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  if (loading) return <p className="mono text-[12px] uppercase tracking-[0.16em] text-muted">loading…</p>;
  if (!items.length)
    return (
      <EmptyState title="Nothing here yet" body="Finished videos will appear here." />
    );

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
                <div className="flex items-center gap-2">
                  <Badge tone={toneFor(it.status)}>{plainStatus(it.status)}</Badge>
                  <span className="mono truncate text-[11px] text-muted">
                    {it.platform} · {fmtBytes(it.file_size)}
                  </span>
                </div>
                {it.error && <p className="line-clamp-2 text-[12px] text-grease">{plainError(it.error)}</p>}
                <div className="mt-0.5 flex items-center gap-3">
                  {it.is_parent ? (
                    <span className="mono text-[12px] uppercase tracking-[0.12em] text-muted">
                      {it.children_done} of {it.children_total} saved
                    </span>
                  ) : it.status === "finished" && it.file_path ? (
                    <a href={api.fileUrl(it.job_id)} className="pressable mono inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.12em] text-amber hover:underline" download>
                      Save to this device
                    </a>
                  ) : it.status === "finished" && it.transferred ? (
                    <span className="mono text-[12px] uppercase tracking-[0.12em] text-fixer">✓ On your device</span>
                  ) : null}
                  {!it.is_parent ? (
                    <button onClick={() => queueAgain(it)} className="pressable mono inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.12em] text-muted hover:text-amber">
                      Download again
                    </button>
                  ) : null}
                  <button onClick={() => removeOne(it.id)} aria-label={`Delete ${it.title}`} className="pressable mono ml-auto inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.12em] text-muted hover:text-grease">
                    Delete
                  </button>
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
          <Button variant="outline" onClick={() => setConfirmClear(false)} className="min-h-[48px] flex-1">
            Keep it
          </Button>
        </div>
      </dialog>
    </div>
  );
}

/** Plain words for history states (badge tone still comes from the raw status). */
function plainStatus(status: string): string {
  switch (status) {
    case "finished":
      return "Done";
    case "error":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "active":
      return "Working";
    case "queued":
      return "Waiting";
    default:
      return status;
  }
}

/** Friendly one-liners for the common engine failures; unknown text passes through. */
function plainError(error: string): string {
  const low = error.toLowerCase();
  if (low.includes("timed out") || low.includes("timeout")) return "The internet was too slow — try again.";
  if (low.includes("private") || low.includes("login") || low.includes("cookies") || low.includes("sign in"))
    return "This video needs a login — add cookies in Settings, then try again.";
  if (low.includes("no video")) return "That post has no video in it — pick a post with a video.";
  if (low.includes("rate-limit") || low.includes("rate limit") || low.includes("too many requests"))
    return "X is rate-limiting right now — wait a few minutes and try again.";
  if (low.includes("ffmpeg")) return "A helper program (FFmpeg) is missing on the laptop.";
  if (low.includes("unsupported")) return "This link can't be downloaded.";
  return error;
}
