import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type StatusTone = "working" | "go" | "stop" | "muted";

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2 py-0.5 text-[12px] font-semibold leading-5",
        tone === "working" && "bg-accentwash text-brand",
        tone === "go" && "bg-gowash text-go",
        tone === "stop" && "bg-stopwash text-stop",
        tone === "muted" && "bg-surface2 text-muted",
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function toneFor(status: string): StatusTone {
  if (status === "finished" || status === "transferred") return "go";
  if (status === "error") return "stop";
  if (status === "cancelled") return "muted";
  if (["queued", "extracting", "downloading", "merging", "active"].includes(status)) return "working";
  return "muted";
}
