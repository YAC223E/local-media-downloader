import type { SystemStatus } from "../lib/api";
import { StatusPill } from "./ui/badge";
import { Icon } from "./ui/Icon";
import { useToast } from "./Toaster";

export function phoneUrl(system: SystemStatus | null): string | null {
  if (!system?.urls?.length) return null;
  const currentHost = window.location.hostname;
  const current = system.urls.find((url) => {
    try {
      return new URL(url).hostname === currentHost;
    } catch {
      return false;
    }
  });
  if (current) return current;
  return system.urls.find((url) => url.includes("192.168.") && !url.includes("192.168.56.")) ?? system.urls[0];
}

export function ServiceStatus({ system, onRetry }: { system: SystemStatus | null; onRetry: () => void }) {
  const ready = !!system?.ok && !!system.ffmpeg;
  const label = !system ? "Checking" : !system.ok ? "Offline" : !system.ffmpeg ? "Helper missing" : "Ready";
  const tone = !system ? "muted" : ready ? "go" : "stop";
  const pill = (
    <StatusPill tone={tone} className="whitespace-nowrap">
      {label}
    </StatusPill>
  );
  if (ready) return <span aria-live="polite">{pill}</span>;
  return (
    <button
      type="button"
      onClick={onRetry}
      aria-label={`${label}. Retry service check.`}
      title="Retry service check"
      className="pressable inline-flex min-h-[44px] items-center rounded-pill"
    >
      {pill}
    </button>
  );
}

export function PhoneLink({ system }: { system: SystemStatus | null }) {
  const toast = useToast();
  const url = phoneUrl(system);
  if (!url) return null;
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
    <button
      type="button"
      onClick={copy}
      title={`Copy ${url}`}
      className="pressable hidden min-h-[44px] items-center gap-2 rounded-field border border-line-strong bg-surface px-3 py-2 text-left hover:border-muted lg:inline-flex"
    >
      <Icon name="wifi" size={16} className="text-brand" />
      <span className="text-[12px] font-semibold text-muted">Phone</span>
      <span className="mono text-[12px] text-ink">{display}</span>
      <Icon name="copy" size={14} className="text-muted" />
    </button>
  );
}
