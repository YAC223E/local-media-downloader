import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  fullWidth = false,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex rounded-field border border-line-strong bg-surface2 p-1",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "pressable inline-flex items-center justify-center gap-1.5 rounded-[9px] font-semibold",
              fullWidth && "flex-1",
              size === "sm" ? "min-h-[44px] px-3 text-[13px]" : "min-h-[44px] px-4 text-sm",
              active ? "bg-accent text-onaccent" : "text-muted hover:text-ink",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
