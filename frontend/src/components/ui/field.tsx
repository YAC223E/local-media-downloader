import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-[14px] font-semibold text-ink">
          {label}
        </label>
      ) : (
        <p className="text-[14px] font-semibold text-ink">{label}</p>
      )}
      {children}
      {hint ? <p className="text-[13px] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}
