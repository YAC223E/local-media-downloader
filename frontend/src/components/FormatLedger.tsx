import { useMemo, useState } from "react";
import { fmtBytes } from "../lib/format";
import type { FormatOption } from "../lib/api";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Select } from "./ui/select";

export interface DownloadExtra {
  audio_quality?: string;
  subtitle_lang?: string | null;
  needs_audio?: boolean;
}

const AUDIO_LEVELS = [
  { kbps: "128", label: "Standard" },
  { kbps: "192", label: "High" },
  { kbps: "320", label: "Best" },
];

/** Quality picker: three plain choices first (Best / Smaller / Sound only),
 *  audio quality chips when Sound is picked, a subtitle row when captions
 *  exist, and every individual format tucked behind a disclosure. */
export function FormatLedger({
  formats,
  preferred,
  subtitles,
  autoCaptions,
  defaultSubLang,
  defaultAudioQuality,
  onDownload,
  downloading,
}: {
  formats: FormatOption[];
  preferred: string;
  subtitles: string[];
  autoCaptions: string[];
  defaultSubLang: string;
  defaultAudioQuality: string;
  onDownload: (f: FormatOption, extra: DownloadExtra) => void;
  downloading: boolean;
}) {
  const videos = useMemo(() => formats.filter((f) => f.kind === "video").slice(0, 12), [formats]);
  const audios = useMemo(() => formats.filter((f) => f.kind === "audio").slice(0, 6), [formats]);
  const choices = useMemo(() => buildChoices(formats, preferred), [formats, preferred]);
  const [picked, setPicked] = useState<string>(() => choices[0]?.format.format_id ?? "");
  const [kbps, setKbps] = useState<string>(defaultAudioQuality || "320");
  const subOptions = useMemo(() => {
    const manual = subtitles.map((l) => ({ code: l, auto: false }));
    const auto = autoCaptions.filter((l) => !subtitles.includes(l)).map((l) => ({ code: l, auto: true }));
    return [...manual, ...auto];
  }, [subtitles, autoCaptions]);
  const [subLang, setSubLang] = useState<string>(() =>
    subOptions.some((o) => o.code === defaultSubLang) ? defaultSubLang : "",
  );

  if (!formats.length) return <p className="sleeve rounded-sm p-4 text-sm text-muted">No downloadable formats found for this link.</p>;
  const activeId = choices.some((c) => c.format.format_id === picked) || formats.some((f) => f.format_id === picked)
    ? picked
    : (choices[0]?.format.format_id ?? "");
  const active = formats.find((f) => f.format_id === activeId) ?? formats[0];
  const audioPicked = active.kind === "audio";

  const go = () => {
    const extra: DownloadExtra = {};
    if (audioPicked) extra.audio_quality = kbps;
    else if (subLang) extra.subtitle_lang = subLang;
    else if (subOptions.length) extra.subtitle_lang = null;
    // Video-only stream (e.g. YouTube 1080p): backend merges best audio in,
    // otherwise the file comes out silent.
    if (!audioPicked && active.vcodec !== "none" && active.acodec === "none") {
      extra.needs_audio = true;
    }
    onDownload(active, extra);
  };

  return (
    <section aria-label="Choose quality" className="sleeve rounded-sm">
      <header className="border-b border-hairline px-3 py-2">
        <h2 className="text-sm font-bold tracking-tight text-ink">Choose quality</h2>
      </header>
      <div role="radiogroup" aria-label="Quality" className="grid gap-2 p-3">
        {choices.map((c) => (
          <label
            key={c.key}
            className={cn(
              "pressable flex min-h-[56px] cursor-pointer items-center gap-3 rounded-sm border px-3 py-2 transition-colors",
              activeId === c.format.format_id ? "border-amber bg-[var(--wash)]" : "border-hairline hover:border-muted",
            )}
          >
            <input
              type="radio"
              // Distinct name from the full list below: with one shared name the
              // browser lets only one radio of the group paint its own checked
              // state, so the visible quick rows would never show their dot.
              name="quick-quality"
              checked={activeId === c.format.format_id}
              onChange={() => setPicked(c.format.format_id)}
              className="h-5 w-5 shrink-0 accent-amber"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-ink">{c.title}</span>
            </span>
            <span className="mono shrink-0 text-[12px] text-muted">{fmtBytes(c.format.filesize)}</span>
          </label>
        ))}
      </div>
      {audioPicked && (
        <div className="px-3 pb-1" role="radiogroup" aria-label="Sound quality">
          <p className="mono pb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">Sound quality</p>
          <div className="grid grid-cols-3 gap-2">
            {AUDIO_LEVELS.map((a) => (
              <button
                key={a.kbps}
                type="button"
                onClick={() => setKbps(a.kbps)}
                aria-pressed={kbps === a.kbps}
                className={cn(
                  "pressable min-h-[48px] rounded-sm border px-2 text-sm font-bold transition-colors",
                  kbps === a.kbps ? "border-amber bg-[var(--wash)] text-ink" : "border-hairline text-muted",
                )}
              >
                {a.label}
                <span className="mono block text-[11px] font-normal">{a.kbps}k</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!audioPicked && subOptions.length > 0 && (
        <div className="px-3 pb-1">
          <label className="mono block pb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="sub-lang">
            Subtitles
          </label>
          <Select
            id="sub-lang"
            value={subLang}
            onChange={(e) => setSubLang(e.target.value)}
          >
            <option value="">No subtitles</option>
            {subOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code.toUpperCase()}
                {o.auto ? " · auto" : ""}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="px-3 py-3">
        <Button onClick={go} disabled={downloading} className="min-h-[52px] w-full text-base">
          {downloading ? "Downloading…" : "Download"}
        </Button>
      </div>
      {(videos.length > 0 || audios.length > 0) && (
        <details className="border-t border-hairline px-3 py-2">
          <summary className="mono cursor-pointer py-1 text-[12px] uppercase tracking-[0.12em] text-muted hover:text-amber">
            More
          </summary>
          {videos.length > 0 && (
            <ol className="mt-1">
              {videos.map((f) => (
                <Row key={f.format_id} f={f} checked={activeId === f.format_id} onPick={() => setPicked(f.format_id)} />
              ))}
            </ol>
          )}
          {audios.length > 0 && (
            <>
              <p className="mono border-t border-hairline px-1 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted">
                Audio
              </p>
              <ol className="pb-1">
                {audios.map((f) => (
                  <Row key={f.format_id} f={f} checked={activeId === f.format_id} onPick={() => setPicked(f.format_id)} />
                ))}
              </ol>
            </>
          )}
        </details>
      )}
    </section>
  );
}

type Choice = { key: string; title: string; format: FormatOption };

function buildChoices(formats: FormatOption[], preferred: string): Choice[] {
  if (!formats.length) return [];
  const combined = formats.filter((f) => f.kind === "video" && f.acodec !== "none");
  const pool = combined.length ? combined : formats.filter((f) => f.kind === "video");
  const audios = formats.filter((f) => f.kind === "audio");
  const out: Choice[] = [];

  // Best: preferred height when set, else the sharpest video stream
  // (audio merges in automatically when the stream is video-only).
  const h = parseInt(preferred, 10);
  let best: FormatOption | undefined;
  if (preferred === "audio") best = audios[0] ?? formats[0];
  else if (Number.isFinite(h)) {
    best = [...pool].sort((a, b) => Math.abs(heightOf(a) - h) - Math.abs(heightOf(b) - h))[0] ?? formats[0];
  } else {
    const vids = formats.filter((f) => f.kind === "video");
    best = (vids.length ? [...vids].sort((a, b) => heightOf(b) - heightOf(a))[0] : formats[0]) ?? formats[0];
  }
  out.push({
    key: "best",
    title: `Best${best.resolution ? ` · ${describeRes(best)}` : ""}`,
    format: best,
  });

  // Smaller: the lightest combined rendition when a clearly lighter one exists
  // (no size data means no claim — better no row than a fake promise).
  const keyOf = (f: FormatOption): number =>
    f.filesize ?? (f.tbr ? (f.tbr * 1000) / 8 : Infinity);
  const sortedLight = [...pool].sort((a, b) => keyOf(a) - keyOf(b));
  const small = sortedLight[0];
  if (small && small.format_id !== best.format_id && small.filesize) {
    const bestSize = best.filesize;
    if (bestSize == null || small.filesize < bestSize) {
      out.push({
        key: "small",
        title: `Smaller${small.resolution ? ` · ${describeRes(small)}` : ""}`,
        format: small,
      });
    }
  }

  // Audio only: first (best) audio rendition.
  if (audios[0] && audios[0].format_id !== best.format_id) {
    out.push({
      key: "audio",
      title: "Sound only",
      format: audios[0],
    });
  }
  return out;
}

function describeRes(f: FormatOption): string {
  const m = f.resolution.match(/x(\d+)/);
  return m ? `${m[1]}p` : f.label;
}

function Row({ f, checked, onPick }: { f: FormatOption; checked: boolean; onPick: () => void }) {
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 border-b border-hairline px-1 py-2 transition-colors last:border-0",
          checked ? "bg-[var(--wash)]" : "hover:bg-panel2",
        )}
      >
        <input type="radio" name="full-quality" checked={checked} onChange={onPick} className="h-4 w-4 accent-amber" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{f.label}</span>
          <span className="mono block truncate text-[11px] text-muted">
            {[f.resolution, f.fps ? `${f.fps}fps` : "", f.vcodec, f.acodec, f.ext.toUpperCase()]
              .filter((v) => v && v !== "unknown")
              .join(" · ")}
          </span>
        </span>
        <span className="mono shrink-0 text-[12px] text-muted">{fmtBytes(f.filesize)}</span>
      </label>
    </li>
  );
}

function heightOf(f: FormatOption): number {
  const m = f.resolution.match(/x(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
