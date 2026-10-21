import { cn } from "../lib/utils";

export function Progress({
  value,
  tone = "working",
  indeterminate = false,
  label,
  className,
}: {
  value: number;
  tone?: "working" | "go" | "stop";
  indeterminate?: boolean;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-pill bg-surface2", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuetext={indeterminate ? "In progress" : `${clamped}%`}
    >
      <div
        className={cn(
          "h-full origin-left rounded-pill transition-transform duration-300",
          tone === "working" && "bg-accent",
          tone === "go" && "bg-go",
          tone === "stop" && "bg-stop",
          indeterminate ? "progress-indeterminate w-[40%]" : "w-full",
        )}
        style={indeterminate ? undefined : { transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}
