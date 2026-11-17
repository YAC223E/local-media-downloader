import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type AppSettings, type SystemStatus } from "../lib/api";
import { languageName } from "../lib/format";
import { useTheme, type ThemeMode } from "../lib/theme";
import { Button } from "./ui/button";
import { Icon, Spinner } from "./ui/Icon";
import { Input } from "./ui/input";
import { Segmented } from "./ui/segmented";
import { Select } from "./ui/select";
import { Switch } from "./ui/switch";
import { useToast } from "./Toaster";
import { cn } from "../lib/utils";

const LANGS = ["en", "fr", "es", "de", "ar", "pt", "it", "nl"];

const SECTIONS = [
  { id: "defaults-appearance", label: "Appearance" },
  { id: "defaults-downloads", label: "Downloads" },
  { id: "defaults-subtitles", label: "Subtitles" },
  { id: "defaults-private", label: "Private" },
  { id: "defaults-advanced", label: "Advanced" },
  { id: "defaults-laptop", label: "This laptop" },
] as const;

function normalize(settings: AppSettings): AppSettings {
  if (settings.preferred_quality === "audio") {
    return { ...settings, preferred_quality: "best", default_to_audio: true };
  }
  return settings;
}

/**
 * Defaults: settings are a sheet over the shelf, not a fourth destination.
 * The sheet keeps every field and saves them together, as before.
 */
export function DefaultsSheet({
  open,
  onClose,
  onSaved,
  system,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: AppSettings) => void;
  system: SystemStatus | null;
}) {
  const toast = useToast();
  const { mode, setMode } = useTheme();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

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
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const dirty = !!s && !!saved && JSON.stringify(s) !== JSON.stringify(saved);

  const save = async () => {
    if (!s || saving || !dirty) return;
    setSaving(true);
    try {
      const updated = normalize(await api.saveSettings(s));
      setS(updated);
      setSaved(updated);
      onSaved(updated);
      toast({ title: "Defaults saved", tone: "ok" });
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

  const jump = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const onBodyScroll = () => {
    const root = bodyRef.current;
    if (!root) return;
    const edge = root.getBoundingClientRect().top + 24;
    let active: string = SECTIONS[0].id;
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element && element.getBoundingClientRect().top <= edge) active = section.id;
    }
    setActiveSection(active);
  };

  return (
    <dialog
      ref={dialogRef}
      id="defaults"
      aria-labelledby="defaults-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      className="defaults-dialog"
    >
      <div className="defaults-dialog__inner">
        <header className="defaults-head">
          <div className="min-w-0">
            <p className="mono text-[11px] uppercase tracking-[0.14em] text-muted">This laptop</p>
            <h2 id="defaults-title" className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">
              Defaults<span className="text-brand">.</span>
            </h2>
            <p className="mt-1 max-w-[42ch] text-[13px] leading-snug text-muted">
              What happens when you add a link. Your phone stays a remote.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close defaults"
            className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-muted hover:bg-surface2 hover:text-ink"
          >
            <Icon name="close" size={19} />
          </button>
        </header>

        <nav aria-label="Defaults sections" className="defaults-tabs">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-current={activeSection === section.id ? "true" : undefined}
              onClick={() => jump(section.id)}
              className="defaults-tab"
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div ref={bodyRef} onScroll={onBodyScroll} className="defaults-body">
          {loading ? (
            <DefaultsSkeleton />
          ) : failed || !s ? (
            <div className="px-5 py-10">
              <div className="grid h-11 w-11 place-items-center rounded-field bg-stopwash text-stop">
                <Icon name="wifi" size={20} />
              </div>
              <h3 className="mt-4 text-[20px] font-semibold text-ink">Can't load defaults</h3>
              <p className="mt-1 max-w-[46ch] text-[14px] leading-relaxed text-muted">
                The downloader service isn't answering. Check that the laptop is awake, then try again.
              </p>
              <Button variant="secondary" onClick={load} className="mt-4">
                <Icon name="refresh" size={16} />
                Try again
              </Button>
            </div>
          ) : (
            <div className="px-4 pb-4 sm:px-5">
              <SettingsSection
                id="defaults-appearance"
                title="Appearance"
                description="Use System to follow this device, or pick a look."
              >
                <SettingRow label="Theme" hint="Theme changes apply right away.">
                  <Segmented
                    label="Theme"
                    options={[
                      { value: "system", label: "System", icon: <Icon name="monitor" size={14} /> },
                      { value: "light", label: "Light", icon: <Icon name="sun" size={14} /> },
                      { value: "dark", label: "Dark", icon: <Icon name="moon" size={14} /> },
                    ]}
                    value={mode}
                    onChange={(value) => setMode(value as ThemeMode)}
                    fullWidth
                  />
                </SettingRow>
              </SettingsSection>

              <SettingsSection
                id="defaults-downloads"
                title="Downloads"
                description="What happens when you paste a link."
              >
                <SettingRow label="Default video quality" htmlFor="quality" hint="The laptop picks the closest available copy.">
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
                </SettingRow>

                <ToggleRow
                  label="Start with audio only"
                  hint="Useful for music. You can still choose video for each download."
                  checked={s.default_to_audio}
                  onChange={(value) => setS({ ...s, default_to_audio: value })}
                />

                <SettingRow label="Audio quality" hint="320k is the default. Lower saves a little space.">
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
                </SettingRow>

                <SettingRow label="Save folder" htmlFor="download-dir" hint="Where this laptop keeps downloads." stacked>
                  <Input
                    id="download-dir"
                    value={s.download_dir}
                    onChange={(event) => setS({ ...s, download_dir: event.target.value })}
                  />
                </SettingRow>

                <SettingRow label="Downloads at once" htmlFor="concurrent" hint="From 1 to 8 at the same time.">
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
                    className="w-28 sm:ml-auto"
                  />
                </SettingRow>

                <ToggleRow
                  label="Remove from this laptop after a phone saves it"
                  hint="The file disappears here once it has been saved. If off, you can save from more than one device."
                  checked={s.auto_delete_after_serve}
                  onChange={(value) => setS({ ...s, auto_delete_after_serve: value })}
                />
              </SettingsSection>

              <SettingsSection
                id="defaults-subtitles"
                title="Subtitles"
                description="Applies to each new download. You can still choose per download."
              >
                <SettingRow label="Save subtitles" htmlFor="sub-mode">
                  <Select
                    id="sub-mode"
                    value={s.subtitle_mode}
                    onChange={(event) => setS({ ...s, subtitle_mode: event.target.value })}
                  >
                    <option value="embed">Inside the video</option>
                    <option value="file">As a separate file</option>
                    <option value="off">Don't save</option>
                  </Select>
                </SettingRow>

                <SettingRow label="Subtitle language" htmlFor="sub-lang-setting">
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
                </SettingRow>

                <ToggleRow
                  label="Use auto-generated captions"
                  hint="When the video has no subtitles of its own."
                  checked={s.subtitle_auto_fallback}
                  onChange={(value) => setS({ ...s, subtitle_auto_fallback: value })}
                />
              </SettingsSection>

              <SettingsSection
                id="defaults-private"
                title="Private videos"
                description="For links that need a login. The file stays on this laptop."
              >
                <div className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">Login file</p>
                    <p className="mt-0.5 max-w-[54ch] text-[13px] leading-relaxed text-muted">
                      Use a login file (.txt) exported from your browser. It stays on this laptop and is never uploaded
                      off this Wi-Fi.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
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
                      {uploading ? <Spinner size={16} className="spin" /> : <Icon name="file" size={16} />}
                      {uploading ? "Uploading…" : s.cookie_file ? "Replace file" : "Add login file"}
                    </Button>
                    {s.cookie_file ? (
                      <span className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-go">
                        <Icon name="check" size={15} strokeWidth={2.4} />
                        Added
                      </span>
                    ) : null}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                id="defaults-advanced"
                title="Advanced"
                description="Only change these if you need to."
              >
                <ToggleRow
                  label="Embed the thumbnail"
                  hint="Adds the preview image inside the file."
                  checked={s.embed_thumbnail}
                  onChange={(value) => setS({ ...s, embed_thumbnail: value })}
                />
                <ToggleRow
                  label="Embed the title"
                  hint="Adds the media title inside the file."
                  checked={s.embed_metadata}
                  onChange={(value) => setS({ ...s, embed_metadata: value })}
                />
                <SettingRow
                  label="Video helper path"
                  htmlFor="ffmpeg-path"
                  hint="Leave blank to find it automatically. Only needed if merging fails."
                  stacked
                >
                  <Input
                    id="ffmpeg-path"
                    value={s.ffmpeg_path ?? ""}
                    onChange={(event) => setS({ ...s, ffmpeg_path: event.target.value })}
                    placeholder="/path/to/ffmpeg"
                  />
                </SettingRow>
              </SettingsSection>

              <SettingsSection
                id="defaults-laptop"
                title="This laptop"
                description="Use one of these addresses on a phone connected to the same Wi-Fi."
              >
                <div className="border-t border-line py-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {system ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-pill px-2.5 py-1 text-[12px] font-semibold",
                          system.ok && system.ffmpeg ? "bg-gowash text-go" : "bg-stopwash text-stop",
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {!system.ok ? "Service offline" : system.ffmpeg ? "Ready" : "Video helper missing"}
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted">Checking the service…</span>
                    )}
                    {system?.ffmpeg_version ? (
                      <span className="mono text-[11px] text-muted">FFmpeg {system.ffmpeg_version}</span>
                    ) : null}
                  </div>

                  {system?.urls?.length ? (
                    <ul className="mt-3 grid gap-1.5">
                      {system.urls.map((url) => (
                        <CopyAddress key={url} url={url} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] text-muted">No network address found. Check that the laptop is on Wi-Fi.</p>
                  )}

                  {system && !system.ffmpeg ? (
                    <p className="mt-3 rounded-field border border-stop/30 bg-stopwash px-3 py-2 text-[13px] leading-relaxed text-stop">
                      Downloads that need merging may fail. Add the helper path under Advanced.
                    </p>
                  ) : null}
                </div>
              </SettingsSection>

              <p className="px-1 pt-4 text-[12px] leading-relaxed text-faint">
                Defaults are stored on this laptop. Theme changes apply immediately; everything else saves together.
              </p>
            </div>
          )}
        </div>

        {!loading && !failed && s ? (
          <div className="defaults-foot">
            <p aria-live="polite" className="min-w-0 flex-1 text-[12px] leading-snug text-muted">
              {dirty ? "Unsaved changes" : "Saved on this laptop."}
            </p>
            {dirty ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setS(saved)}>
                  Discard
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Spinner size={15} className="spin" /> : null}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line py-6 first:border-t-0">
      <div className="mb-4">
        <h3 id={`${id}-title`} className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h3>
        {description ? <p className="mt-1 max-w-[56ch] text-[13px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  hint,
  htmlFor,
  children,
  stacked = false,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 border-t border-line py-4 first:border-t-0 first:pt-0",
        !stacked && "sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center sm:gap-6",
      )}
    >
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[14px] font-semibold text-ink">
            {label}
          </label>
        ) : (
          <p className="text-[14px] font-semibold text-ink">{label}</p>
        )}
        {hint ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{hint}</p> : null}
      </div>
      <div className={cn("min-w-0", !stacked && "sm:justify-self-end sm:w-full")}>{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-ink">{label}</p>
        {hint ? <p className="mt-0.5 max-w-[56ch] text-[13px] leading-snug text-muted">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
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
    <li className="flex min-h-11 items-center gap-2 rounded-field border border-line bg-surface2 px-3">
      <Icon name="wifi" size={15} className="shrink-0 text-info" />
      <span className="mono min-w-0 flex-1 truncate text-[12px] text-ink">{display}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${url}`}
        className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-[7px] text-muted hover:bg-surface hover:text-ink"
      >
        <Icon name="copy" size={15} />
      </button>
    </li>
  );
}

function DefaultsSkeleton() {
  return (
    <div className="px-4 sm:px-5" aria-busy="true">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="border-t border-line py-6 first:border-t-0">
          <div className="shimmer h-4 w-40 rounded bg-surface2" />
          <div className="shimmer mt-2 h-3 w-64 rounded bg-surface2" />
          <div className="shimmer mt-4 h-12 rounded-field bg-surface2" />
        </div>
      ))}
    </div>
  );
}
