import type { SystemStatus } from "../lib/api";
import { cn } from "../lib/utils";
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

export function ServiceStatus({
  system,
  onRetry,
  className,
  compact = false,
}: {
  system: SystemStatus | null;
  onRetry: () => void;
  className?: string;
  compact?: boolean;
}) {
  const ready = !!system?.ok && !!system.ffmpeg;
  const label = !system ? "Checking" : !system.ok ? "Offline" : !system.ffmpeg ? "Helper missing" : "Ready";
  const tone = !system ? "muted" : ready ? "go" : "stop";

  const content = (
    <span
      title={label}
      className={cn("inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "go" && "bg-go",
          tone === "stop" && "bg-stop",
          tone === "muted" && "bg-faint",
        )}
      />
      <span
        className={cn(
          tone === "go" ? "text-muted" : tone === "stop" ? "text-stop" : "text-muted",
          compact && "max-sm:sr-only",
        )}
      >
        {label}
      </span>
    </span>
  );

  if (ready) return <span aria-live="polite">{content}</span>;
  return (
    <button
      type="button"
      onClick={onRetry}
      aria-label={`${label}. Retry service check.`}
      title="Retry service check"
      className="pressable inline-flex min-h-11 items-center rounded-[6px] px-1"
    >
      {content}
    </button>
  );
}

export function PhoneLink({ system, className }: { system: SystemStatus | null; className?: string }) {
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
      className={cn(
        "pressable flex min-h-11 w-full items-center gap-1.5 rounded-[8px] px-1.5 py-2 text-left hover:bg-surface2",
        className,
      )}
    >
      <Icon name="wifi" size={14} className="shrink-0 text-info" />
      <span className="min-w-0 flex-1">
        <span className="mono block truncate text-[11px] leading-4 tracking-[-0.01em] text-ink">{display}</span>
      </span>
      <Icon name="copy" size={12} className="shrink-0 text-muted" />
    </button>
  );
}
