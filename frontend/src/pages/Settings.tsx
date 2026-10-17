import { useEffect, useState } from "react";
import { api, type AppSettings } from "../lib/api";
import { useTheme, type ThemeMode } from "../lib/theme";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useToast } from "../components/Toaster";

/** Settings grouped by use: Appearance, Quality, Downloads, Subtitles,
 *  Private videos, Advanced. Behavior and persistence unchanged. */
export function Settings({ onSaved }: { onSaved: (s: AppSettings) => void }) {
  const toast = useToast();
  const { mode, setMode } = useTheme();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings().then(setS).catch(() => toast({ title: "Settings unavailable", tone: "err" }));
  }, [toast]);

  if (!s) return <p className="mono text-[12px] uppercase tracking-[0.16em] text-muted">loading settings…</p>;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.saveSettings(s);
      setS(updated);
      onSaved(updated);
      toast({ title: "Settings saved", tone: "ok" });
    } catch (e) {
      toast({ title: "Could not save", body: e instanceof Error ? e.message : "Save failed.", tone: "err" });
    } finally {
      setSaving(false);
    }
  };

  const uploadCookies = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/settings/cookies", { method: "POST", body: form });
    if (!res.ok) {
      toast({ title: "Upload failed", body: "It must be a cookies .txt file.", tone: "err" });
      return;
    }
    const updated = (await res.json()) as AppSettings;
    setS(updated);
    onSaved(updated);
    toast({ title: "Login file added", tone: "ok" });
  };

  return (
    <div className="grid max-w-2xl gap-4">
      <section aria-label="Appearance" className="sleeve rounded-sm p-4">
        <h2 className="text-[15px] font-bold text-ink">Appearance</h2>
        <label className="mono mt-3 block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="theme">
          Theme
        </label>
        <Select
          id="theme"
          value={mode}
          onChange={(e) => setMode(e.target.value as ThemeMode)}
          className="mt-1"
        >
          <option value="system">Follow phone / laptop</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </Select>
      </section>

      <section aria-label="Quality" className="sleeve rounded-sm p-4">
        <h2 className="text-[15px] font-bold text-ink">Quality</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mono block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="quality">
              Video quality
            </label>
            <Select
              id="quality"
              value={s.preferred_quality}
              onChange={(e) => setS({ ...s, preferred_quality: e.target.value })}
              className="mt-1"
            >
              <option value="best">Best</option>
              <option value="1080">Good (1080p)</option>
              <option value="720">Smaller (720p)</option>
              <option value="480">Smallest (480p)</option>
              <option value="audio">Sound only</option>
            </Select>
          </div>
          <div>
            <label className="mono block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="audioq">
              Sound quality
            </label>
            <Select
              id="audioq"
              value={s.audio_quality}
              onChange={(e) => setS({ ...s, audio_quality: e.target.value })}
              className="mt-1"
            >
              <option value="320">Best (320k)</option>
              <option value="192">High (192k)</option>
              <option value="128">Standard (128k)</option>
            </Select>
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-[15px] text-ink">
          <input type="checkbox" checked={s.default_to_audio} onChange={(e) => setS({ ...s, default_to_audio: e.target.checked })} className="h-5 w-5 accent-amber" />
          Mostly music?
        </label>
      </section>

      <section aria-label="Downloads" className="sleeve rounded-sm p-4">
        <h2 className="text-[15px] font-bold text-ink">Downloads</h2>
        <label className="mono mt-3 block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="dl-dir">
          Laptop folder
        </label>
        <Input id="dl-dir" value={s.download_dir} onChange={(e) => setS({ ...s, download_dir: e.target.value })} className="mt-1" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mono block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="conc">
              At once (1–8)
            </label>
            <Input
              id="conc"
              type="number"
              min={1}
              max={8}
              value={s.concurrent_limit}
              onChange={(e) => setS({ ...s, concurrent_limit: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-[15px] text-ink">
          <input type="checkbox" checked={s.auto_delete_after_serve} onChange={(e) => setS({ ...s, auto_delete_after_serve: e.target.checked })} className="mt-1 h-5 w-5 accent-amber" />
          Tidy the laptop after phones save videos
        </label>
      </section>

      <section aria-label="Subtitles" className="sleeve rounded-sm p-4">
        <h2 className="text-[15px] font-bold text-ink">Subtitles</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mono block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="submode">
              Mode
            </label>
            <Select
              id="submode"
              value={s.subtitle_mode}
              onChange={(e) => setS({ ...s, subtitle_mode: e.target.value })}
              className="mt-1"
            >
              <option value="embed">In the video</option>
              <option value="file">Separate file</option>
              <option value="off">Off</option>
            </Select>
          </div>
          <div>
            <label className="mono block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="sublang">
              Language
            </label>
            <Select
              id="sublang"
              value={s.subtitle_lang}
              onChange={(e) => setS({ ...s, subtitle_lang: e.target.value })}
              className="mt-1"
            >
              {["en", "fr", "es", "de", "ar", "pt", "it", "nl"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={s.subtitle_auto_fallback} onChange={(e) => setS({ ...s, subtitle_auto_fallback: e.target.checked })} className="h-4 w-4 accent-amber" />
          Use auto captions when real ones are missing
        </label>
      </section>

      <section aria-label="Private videos" className="sleeve rounded-sm p-4">
        <h2 className="text-[15px] font-bold text-ink">Private videos</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          For videos that need a login, add your browser's login file here. It never leaves this laptop.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex h-12 cursor-pointer items-center rounded-sm border border-hairline px-4 text-[15px] font-semibold text-ink hover:border-amber hover:text-amber">
            {s.cookie_file ? "Replace login file" : "Add login file"}
            <input type="file" accept=".txt" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCookies(e.target.files[0])} />
          </label>
          {s.cookie_file && (
            <span className="mono text-[12px] text-fixer">added ✓</span>
          )}
        </div>
      </section>

      <section aria-label="Advanced" className="sleeve rounded-sm p-4">
        <h2 className="text-[15px] font-bold text-ink">Advanced</h2>
        <div className="mt-3 grid gap-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={s.embed_thumbnail} onChange={(e) => setS({ ...s, embed_thumbnail: e.target.checked })} className="h-4 w-4 accent-amber" />
            Put the thumbnail picture inside the file
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={s.embed_metadata} onChange={(e) => setS({ ...s, embed_metadata: e.target.checked })} className="h-4 w-4 accent-amber" />
            Put the title inside the file
          </label>
          <div>
            <label className="mono block text-[11px] uppercase tracking-[0.14em] text-muted" htmlFor="ffpath">
              Video helper location (blank = find it)
            </label>
            <Input
              id="ffpath"
              value={s.ffmpeg_path ?? ""}
              onChange={(e) => setS({ ...s, ffmpeg_path: e.target.value })}
              placeholder="e.g. C:\ffmpeg\bin\ffmpeg.exe"
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving} className="min-h-[52px] justify-self-start px-8 text-base">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
