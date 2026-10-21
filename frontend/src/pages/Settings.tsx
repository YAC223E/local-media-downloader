import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type AppSettings, type SystemStatus } from "../lib/api";
import { languageName } from "../lib/format";
import { useTheme, type ThemeMode } from "../lib/theme";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/ui/button";
import { Field } from "../components/ui/field";
import { Icon, Spinner } from "../components/ui/Icon";
import { Input } from "../components/ui/input";
import { Segmented } from "../components/ui/segmented";
import { Select } from "../components/ui/select";
import { SwitchRow } from "../components/ui/switch";
import { useToast } from "../components/Toaster";
import { cn } from "../lib/utils";

const LANGS = ["en", "fr", "es", "de", "ar", "pt", "it", "nl"];

function normalize(settings: AppSettings): AppSettings {
  if (settings.preferred_quality === "audio") {
    return { ...settings, preferred_quality: "best", default_to_audio: true };
  }
  return settings;
}

/** Settings grouped by use: look, downloads, subtitles, private videos, more. */
export function Settings({ onSaved, system }: { onSaved: (settings: AppSettings) => void; system: SystemStatus | null }) {
  const toast = useToast();
  const { mode, setMode } = useTheme();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const next = normalize(await api.settings());
      setS(next);
      setSaved(next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = !!s && !!saved && JSON.stringify(s) !== JSON.stringify(saved);

  const save = async () => {
    if (!s || saving || !dirty) return;
    setSaving(true);
    try {
      const updated = await api.saveSettings(s);
      setS(updated);
      setSaved(updated);
      onSaved(updated);
      toast({ title: "Settings saved", tone: "ok" });
    } catch (error) {
      toast({ title: "Could not save", body: error instanceof Error ? error.message : "Save failed.", tone: "err" });
    } finally {
      setSaving(false);
    }
  };

  const uploadCookies = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/settings/cookies", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload failed");
      const updated = normalize((await res.json()) as AppSettings);
      setS(updated);
      setSaved(updated);
      onSaved(updated);
      toast({ title: "Login file added", body: "It stays on this laptop.", tone: "ok" });
    } catch {
      toast({ title: "Upload failed", body: "Choose a login file (.txt) exported from your browser.", tone: "err" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader title="Settings" description="Defaults for this laptop. Your phone stays a remote." />
        <div className="grid gap-4">
          {[0, 1, 2].map((n) => (
            <div key={n} className="rounded-card border border-line bg-surface p-5" aria-busy="true">
              <div className="h-5 w-32 rounded bg-surface2" />
              <div className="mt-4 h-12 rounded-field bg-surface2" />
              <div className="mt-3 h-12 rounded-field bg-surface2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (failed || !s) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader title="Settings" description="Defaults for this laptop. Your phone stays a remote." />
        <EmptyState
          title="Can't load settings"
          body="The downloader service isn't answering. Check that it's running, then try again."
          icon="wifi"
          action={
            <Button variant="secondary" onClick={load}>
              <Icon name="refresh" size={17} />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-3xl", dirty ? "pb-24 md:pb-0" : "pb-10 md:pb-0")}>
      <PageHeader
        title="Settings"
        description="Defaults for this laptop. Your phone stays a remote."
        action={
          <Button onClick={save} disabled={saving || !dirty} className="hidden md:inline-flex">
            {saving ? <Spinner size={16} className="spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      <div className="grid gap-4">
        <SettingsSection title="Appearance" description="Use System to follow this device, or pick a look.">
          <Segmented
            label="Theme"
            options={[
              { value: "system", label: "System", icon: <Icon name="monitor" size={15} /> },
              { value: "light", label: "Light", icon: <Icon name="sun" size={15} /> },
              { value: "dark", label: "Dark", icon: <Icon name="moon" size={15} /> },
            ]}
            value={mode}
            onChange={(value) => setMode(value as ThemeMode)}
            fullWidth
          />
          <p className="text-[13px] text-muted">Theme changes apply right away.</p>
        </SettingsSection>

        <SettingsSection title="Downloads" description="What happens when you paste a link.">
          <Field label="Default video quality" htmlFor="quality" hint="The laptop picks the closest available copy.">
            <Select
              id="quality"
              value={s.preferred_quality}
              onChange={(event) => setS({ ...s, preferred_quality: event.target.value })}
            >
              <option value="best">Best available</option>
              <option value="1080">1080p — sharp</option>
              <option value="720">720p — smaller</option>
              <option value="480">480p — smallest</option>
            </Select>
          </Field>

          <SwitchRow
            checked={s.default_to_audio}
            onChange={(value) => setS({ ...s, default_to_audio: value })}
            label="Start with audio only"
            description="Useful for music. You can still choose video for each download."
          />

          <Field label="Audio quality" hint="320k is the default. Lower saves a little space.">
            <Segmented
              label="Audio quality"
              options={[
                { value: "128", label: "128k" },
                { value: "192", label: "192k" },
                { value: "320", label: "320k" },
              ]}
              value={s.audio_quality}
              onChange={(value) => setS({ ...s, audio_quality: value })}
              fullWidth
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Save folder" htmlFor="download-dir" hint="Where this laptop keeps downloads.">
              <Input
                id="download-dir"
                value={s.download_dir}
                onChange={(event) => setS({ ...s, download_dir: event.target.value })}
              />
            </Field>
            <Field label="Downloads at once" htmlFor="concurrent" hint="From 1 to 8 at the same time.">
              <Input
                id="concurrent"
                type="number"
                min={1}
                max={8}
                value={s.concurrent_limit}
                onChange={(event) => setS({ ...s, concurrent_limit: Number(event.target.value) })}
                onBlur={() =>
                  setS((prev) =>
                    prev ? { ...prev, concurrent_limit: Math.min(8, Math.max(1, prev.concurrent_limit || 1)) } : prev,
                  )
                }
              />
            </Field>
          </div>

          <SwitchRow
            checked={s.auto_delete_after_serve}
            onChange={(value) => setS({ ...s, auto_delete_after_serve: value })}
            label="Remove from this laptop after a phone saves it"
            description="The file disappears here once it has been saved. If off, you can save from more than one device."
          />
        </SettingsSection>

        <SettingsSection title="Subtitles" description="Applies to each new download. You can still choose per download.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Save subtitles" htmlFor="sub-mode">
              <Select
                id="sub-mode"
                value={s.subtitle_mode}
                onChange={(event) => setS({ ...s, subtitle_mode: event.target.value })}
              >
                <option value="embed">Inside the video</option>
                <option value="file">As a separate file</option>
                <option value="off">Don't save</option>
              </Select>
            </Field>
            <Field label="Subtitle language" htmlFor="sub-lang-setting">
              <Select
                id="sub-lang-setting"
                value={s.subtitle_lang}
                onChange={(event) => setS({ ...s, subtitle_lang: event.target.value })}
              >
                {LANGS.map((lang) => (
                  <option key={lang} value={lang}>
                    {languageName(lang)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <SwitchRow
            checked={s.subtitle_auto_fallback}
            onChange={(value) => setS({ ...s, subtitle_auto_fallback: value })}
            label="Use auto-generated captions"
            description="When the video has no subtitles of its own."
          />
        </SettingsSection>

        <SettingsSection title="Private videos" description="For links that need a login. The file stays on this laptop.">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".txt"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadCookies(file);
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner size={17} className="spin" /> : <Icon name="file" size={17} />}
              {uploading ? "Uploading…" : s.cookie_file ? "Replace login file" : "Add login file"}
            </Button>
            {s.cookie_file ? (
              <span className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-go">
                <Icon name="check" size={15} strokeWidth={2.4} />
                Login file added
              </span>
            ) : null}
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            Use a login file (.txt) exported from your browser. It stays on this laptop and is never uploaded off this Wi-Fi.
          </p>
        </SettingsSection>

        <SettingsSection title="More options" description="Only change these if you need to.">
          <SwitchRow
            checked={s.embed_thumbnail}
            onChange={(value) => setS({ ...s, embed_thumbnail: value })}
            label="Embed the thumbnail"
            description="Adds the preview image inside the file."
          />
          <SwitchRow
            checked={s.embed_metadata}
            onChange={(value) => setS({ ...s, embed_metadata: value })}
            label="Embed the title"
            description="Adds the media title inside the file."
          />
          <Field
            label="Video helper path"
            htmlFor="ffmpeg-path"
            hint="Leave blank to find it automatically. Only needed if merging fails."
          >
            <Input
              id="ffmpeg-path"
              value={s.ffmpeg_path ?? ""}
              onChange={(event) => setS({ ...s, ffmpeg_path: event.target.value })}
              placeholder="C:/ffmpeg/bin/ffmpeg.exe"
            />
          </Field>
        </SettingsSection>

        <SettingsSection title="This laptop" description="Use one of these addresses on a phone connected to the same Wi-Fi.">
          <div className="flex flex-wrap items-center gap-2">
            {system ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[13px] font-semibold",
                  system.ok && system.ffmpeg ? "bg-gowash text-go" : "bg-stopwash text-stop",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {!system.ok ? "Service offline" : system.ffmpeg ? "Ready" : "Video helper missing"}
              </span>
            ) : (
              <span className="text-[13px] text-muted">Checking the service…</span>
            )}
            {system?.ffmpeg_version ? <span className="mono text-[12px] text-muted">{system.ffmpeg_version}</span> : null}
          </div>

          {system?.urls?.length ? (
            <ul className="grid gap-2">
              {system.urls.map((url) => (
                <CopyAddress key={url} url={url} />
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No network address found. Check that the laptop is on Wi-Fi.</p>
          )}

          {system && !system.ffmpeg ? (
            <p className="rounded-field border border-stop/30 bg-stopwash px-3 py-2 text-[13px] leading-relaxed text-stop">
              Downloads that need merging may fail. Add the helper path under More options.
            </p>
          ) : null}
        </SettingsSection>
      </div>

      <div className="mt-5 hidden items-center gap-3 md:flex">
        <Button onClick={save} disabled={saving || !dirty} size="lg">
          {saving ? <Spinner size={17} className="spin" /> : <Icon name="check" size={17} />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <p aria-live="polite" className="text-[14px] text-muted">
          {dirty ? "Unsaved changes" : "All changes saved."}
        </p>
      </div>

      {dirty ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-line bg-surface px-4 py-3 shadow-float md:hidden"
          style={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="min-w-0 flex-1 text-[13px] text-muted">Unsaved changes</p>
            <Button onClick={save} disabled={saving} className="shrink-0">
              {saving ? <Spinner size={16} className="spin" /> : null}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid min-w-0 gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div>
        <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CopyAddress({ url }: { url: string }) {
  const toast = useToast();
  const display = url.replace(/^https?:\/\//, "");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Phone link copied", body: "Open it on a phone connected to the same Wi-Fi.", tone: "ok" });
    } catch {
      toast({ title: "Copy this address", body: display, tone: "info" });
    }
  };
  return (
    <li className="flex items-center gap-2 rounded-field border border-line bg-surface2/50 px-3 py-2">
      <Icon name="wifi" size={16} className="shrink-0 text-brand" />
      <span className="mono min-w-0 flex-1 truncate text-[13px] text-ink">{display}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${url}`}
        className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-muted hover:bg-surface2 hover:text-ink"
      >
        <Icon name="copy" size={16} />
      </button>
    </li>
  );
}
