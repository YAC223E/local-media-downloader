import { useEffect, useMemo, useState, type Ref } from "react";
import type { FormatOption, MediaInfo } from "../lib/api";
import { fmtBytes, fmtDuration, languageName, platformKey, platformLabel } from "../lib/format";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Icon } from "./ui/Icon";
import { Segmented } from "./ui/segmented";
import { Select } from "./ui/select";
import { PlatformMark } from "./PlatformMark";

export interface DownloadExtra {
  audio_quality?: string;
  subtitle_lang?: string | null;
  needs_audio?: boolean;
}

export interface QualitySelection {
  format: FormatOption;
  extra: DownloadExtra;
  title: string;
  meta: string;
}

const AUDIO_LEVELS = [
  { value: "128", label: "128k" },
  { value: "192", label: "192k" },
  { value: "320", label: "320k" },
] as const;

type Choice = { key: string; title: string; format: FormatOption };

/** Quality picker: three plain choices, audio bitrate when relevant, a
 *  per-download subtitle row, and every individual format behind a disclosure. */
export function QualityPicker({
  info,
  preferred,
  defaultSubLang,
  defaultAudioQuality,
  onDownload,
  onSelectionChange,
  downloading,
  headingRef,
}: {
  info: MediaInfo;
  preferred: string;
  defaultSubLang: string;
  defaultAudioQuality: string;
  onDownload: (format: FormatOption, extra: DownloadExtra) => void;
  onSelectionChange?: (selection: QualitySelection) => void;
  downloading: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const { formats, subtitles, automatic_captions: autoCaptions } = info;
  const choices = useMemo(() => buildChoices(formats, preferred), [formats, preferred]);
  const videos = useMemo(() => formats.filter((f) => f.kind === "video").slice(0, 12), [formats]);
  const audios = useMemo(() => formats.filter((f) => f.kind === "audio").slice(0, 6), [formats]);
  const [picked, setPicked] = useState<string>(() => defaultFormatId(choices, formats, preferred));
  const [kbps, setKbps] = useState<string>(defaultAudioQuality || "320");
  const subOptions = useMemo(() => {
    const manual = subtitles.map((code) => ({ code, auto: false }));
    const auto = autoCaptions.filter((code) => !subtitles.includes(code)).map((code) => ({ code, auto: true }));
    return [...manual, ...auto];
  }, [subtitles, autoCaptions]);
  const [subLang, setSubLang] = useState<string>(() =>
    subOptions.some((option) => option.code === defaultSubLang) ? defaultSubLang : "",
  );

  const activeId =
    choices.some((choice) => choice.format.format_id === picked) || formats.some((format) => format.format_id === picked)
      ? picked
      : (choices[0]?.format.format_id ?? formats[0]?.format_id ?? "");
  const active = formats.find((format) => format.format_id === activeId) ?? formats[0] ?? null;
  const audioPicked = active?.kind === "audio";
  const activeChoice = active ? choices.find((choice) => choice.format.format_id === activeId) : undefined;
  const title = active ? (activeChoice?.title ?? formatTitle(active)) : "";
  const meta = active ? (activeChoice ? choiceMeta(activeChoice, kbps) : formatMeta(active)) : "";
  const extra = useMemo(
    () => (active ? buildExtra(active, kbps, subLang, subOptions.length > 0, audioPicked) : null),
    [active, kbps, subLang, subOptions.length, audioPicked],
  );

  useEffect(() => {
    if (!active || !extra) return;
    onSelectionChange?.({ format: active, extra, title, meta });
  }, [active, extra, title, meta, onSelectionChange]);

  if (!active || !extra) {
    return (
      <section className="rounded-card border border-line bg-surface p-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-field bg-accentwash text-brand">
          <Icon name="alert" size={22} />
        </div>
        <h2 className="text-[17px] font-bold text-ink">No downloadable versions</h2>
        <p className="mx-auto mt-1 max-w-[42ch] text-[15px] text-muted">
          This link didn't return a file we can save. Try another link.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Choose quality" className="overflow-hidden rounded-card border border-line bg-surface">
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
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="line-clamp-2 text-[15px] font-bold leading-snug text-ink focus:outline-none"
          >
            {info.title}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {platformLabel(info.platform, info.webpage_url)}
            {info.duration ? ` · ${fmtDuration(info.duration)}` : ""}
          </p>
        </div>
      </div>

      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[15px] font-bold text-ink">Choose a copy</h3>
        <p className="mt-0.5 text-[13px] text-muted">The laptop downloads this copy; then your phone can save it.</p>
      </div>

      <div role="radiogroup" aria-label="Quality" className="grid gap-2 p-4">
        {choices.map((choice) => {
          const selected = activeId === choice.format.format_id;
          return (
            <label
              key={choice.key}
              className={cn(
                "pressable flex min-h-[68px] cursor-pointer items-center gap-3 rounded-field border p-3.5",
                "focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-surface",
                selected ? "border-accent bg-accentwash" : "border-line-strong bg-surface hover:border-muted",
              )}
            >
              <input
                type="radio"
                name="quick-quality"
                checked={selected}
                onChange={() => setPicked(choice.format.format_id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2",
                  selected ? "border-accent" : "border-line-strong",
                )}
              >
                {selected ? <span className="h-3 w-3 rounded-full bg-accent" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-ink">{choice.title}</span>
                <span className="block text-[13px] text-muted">{choiceMeta(choice, kbps)}</span>
              </span>
              {choice.key !== "audio" && choice.format.filesize ? (
                <span className="mono shrink-0 text-[13px] text-muted">{fmtBytes(choice.format.filesize)}</span>
              ) : null}
            </label>
          );
        })}
      </div>

      {audioPicked ? (
        <div className="px-4 pb-4">
          <p className="mb-2 text-[14px] font-semibold text-ink">Audio quality</p>
          <Segmented
            label="Audio quality"
            options={AUDIO_LEVELS.map((level) => ({ value: level.value, label: level.label }))}
            value={kbps}
            onChange={setKbps}
            fullWidth
          />
          <p className="mt-2 text-[13px] text-muted">320k is the default. Lower saves a little space.</p>
        </div>
      ) : null}

      {!audioPicked && subOptions.length > 0 ? (
        <div className="px-4 pb-4">
          <Field label="Subtitles" htmlFor="sub-lang" hint="Choose a language for this download.">
            <Select id="sub-lang" value={subLang} onChange={(event) => setSubLang(event.target.value)}>
              <option value="">No subtitles</option>
              {subOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {languageName(option.code)}
                  {option.auto ? " · auto" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <div className="hidden px-4 pb-4 md:block">
        <Button onClick={() => onDownload(active, extra)} disabled={downloading} size="lg" className="flex w-full">
          {downloading ? "Downloading…" : "Download"}
        </Button>
        <p className="mt-2 text-center text-[13px] text-muted">The laptop keeps working if you leave this page.</p>
      </div>

      {videos.length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-semibold text-ink hover:bg-surface2 [&::-webkit-details-marker]:hidden">
            Show all formats
            <Icon name="chevronDown" size={18} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line px-2 pb-2">
            <ol aria-label="Video formats">
              {videos.map((format) => (
                <FormatRow
                  key={format.format_id}
                  format={format}
                  checked={activeId === format.format_id}
                  onPick={() => setPicked(format.format_id)}
                />
              ))}
            </ol>
          </div>
        </details>
      )}
    </section>
  );
}

function FormatRow({ format, checked, onPick }: { format: FormatOption; checked: boolean; onPick: () => void }) {
  return (
    <li>
      <label
        className={cn(
          "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 transition-colors",
          checked ? "bg-accentwash" : "hover:bg-surface2",
        )}
      >
        <input
          type="radio"
          name="full-quality"
          checked={checked}
          onChange={onPick}
          className="h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink">{format.label}</span>
          <span className="mono block truncate text-[12px] text-muted">{formatMeta(format)}</span>
        </span>
        {format.filesize ? <span className="mono shrink-0 text-[12px] text-muted">{fmtBytes(format.filesize)}</span> : null}
      </label>
    </li>
  );
}

function buildChoices(formats: FormatOption[], preferred: string): Choice[] {
  // Keep higher-resolution video-only streams in the pool; the backend adds
  // the best audio track when needed. Preferring only combined streams here
  // capped YouTube at the low-resolution progressive renditions.
  const videoPool = formats.filter((format) => format.kind === "video");
  const audios = formats.filter((format) => format.kind === "audio");
  const best = bestVideo(videoPool, preferred);
  const out: Choice[] = [];

  if (best) {
    const bestTitle = preferred === "best" ? "Best quality" : preferred === "audio" ? "Best video" : "Best match";
    out.push({ key: "best", title: bestTitle, format: best });
  }

  const keyOf = (format: FormatOption): number => format.filesize ?? (format.tbr ? (format.tbr * 1000) / 8 : Infinity);
  const smallest = [...videoPool].sort((a, b) => keyOf(a) - keyOf(b))[0];
  if (smallest && smallest.format_id !== best?.format_id && smallest.filesize) {
    if (best?.filesize == null || smallest.filesize < best.filesize) {
      out.push({ key: "small", title: "Smaller file", format: smallest });
    }
  }

  if (audios[0]) out.push({ key: "audio", title: videoPool.length ? "Audio only" : "Audio", format: audios[0] });
  return out;
}

function defaultFormatId(choices: Choice[], formats: FormatOption[], preferred: string): string {
  if (preferred === "audio") {
    const audio = choices.find((choice) => choice.format.kind === "audio");
    if (audio) return audio.format.format_id;
  }
  const numeric = parseInt(preferred, 10);
  if (Number.isFinite(numeric)) {
    const videoChoices = choices.filter((choice) => choice.format.kind === "video");
    const closest = [...videoChoices].sort(
      (a, b) => Math.abs(heightOf(a.format) - numeric) - Math.abs(heightOf(b.format) - numeric),
    )[0];
    if (closest) return closest.format.format_id;
  }
  return choices[0]?.format.format_id ?? formats[0]?.format_id ?? "";
}

function weightOf(format: FormatOption): number {
  return Math.max(format.tbr ?? 0, format.filesize ? (format.filesize * 8) / 1000 : 0);
}

function bestVideo(pool: FormatOption[], preferred: string): FormatOption | undefined {
  if (!pool.length) return undefined;
  const numeric = parseInt(preferred, 10);
  return [...pool].sort((a, b) => {
    if (Number.isFinite(numeric)) {
      const byTarget = Math.abs(heightOf(a) - numeric) - Math.abs(heightOf(b) - numeric);
      if (byTarget !== 0) return byTarget;
    }
    // Higher resolution first; at the same height prefer a stream that
    // already carries audio, then the higher bitrate.
    const byHeight = heightOf(b) - heightOf(a);
    if (byHeight !== 0) return byHeight;
    const aHasAudio = a.acodec !== "none" ? 1 : 0;
    const bHasAudio = b.acodec !== "none" ? 1 : 0;
    if (aHasAudio !== bHasAudio) return bHasAudio - aHasAudio;
    return weightOf(b) - weightOf(a);
  })[0];
}

function heightOf(format: FormatOption): number {
  const match = format.resolution.match(/x(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function describeRes(format: FormatOption): string {
  const match = format.resolution.match(/x(\d+)/);
  if (match) return `${match[1]}p`;
  if (format.resolution && format.resolution !== "audio") return format.resolution;
  return format.kind === "audio" ? "Audio" : "Video";
}

function choiceMeta(choice: Choice, kbps: string): string {
  return choice.key === "audio" ? `MP3 · ${kbps}k` : formatMeta(choice.format);
}

function formatMeta(format: FormatOption): string {
  if (format.kind === "audio") {
    return [format.ext.toUpperCase(), format.acodec !== "none" ? format.acodec : "audio"].filter(Boolean).join(" · ");
  }
  return [describeRes(format), format.ext.toUpperCase(), format.fps ? `${format.fps} fps` : ""].filter(Boolean).join(" · ");
}

function formatTitle(format: FormatOption): string {
  if (format.kind === "audio") return "Audio only";
  return `${describeRes(format)} ${format.ext.toUpperCase()}`;
}

function buildExtra(
  active: FormatOption,
  kbps: string,
  subLang: string,
  hasSubtitles: boolean,
  audioPicked: boolean,
): DownloadExtra {
  const extra: DownloadExtra = {};
  if (audioPicked) extra.audio_quality = kbps;
  else if (subLang) extra.subtitle_lang = subLang;
  else if (hasSubtitles) extra.subtitle_lang = null;
  if (!audioPicked && active.vcodec !== "none" && active.acodec === "none") {
    extra.needs_audio = true;
  }
  return extra;
}
