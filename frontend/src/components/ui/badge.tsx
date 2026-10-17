import { ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Status badge: state color does the job (fixer=finished, amber=working, grease=error). */
export function Badge({ tone, children }: { tone: "amber" | "fixer" | "grease" | "muted"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] transition-colors",
        tone === "amber" && "border-amber/60 text-amber",
        tone === "fixer" && "border-fixer/60 text-fixer",
        tone === "grease" && "border-grease/60 text-grease",
        tone === "muted" && "border-hairline text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function toneFor(status: string): "amber" | "fixer" | "grease" | "muted" {
  if (status === "finished") return "fixer";
  if (status === "error") return "grease";
  if (status === "cancelled") return "muted";
  if (["queued", "extracting", "downloading", "merging", "active"].includes(status)) return "amber";
  return "muted";
}
