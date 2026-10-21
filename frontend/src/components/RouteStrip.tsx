import { cn } from "../lib/utils";
import { Icon } from "./ui/Icon";

export type RouteStep = 0 | 1 | 2;

const STEPS = ["Link", "Laptop", "Phone"] as const;

/**
 * The signature move: a three-stop route that explains the two-machine model.
 * Link is read; the laptop fetches; the phone saves. Green means the file has
 * actually arrived on the phone, not merely finished downloading.
 */
export function RouteStrip({
  step,
  complete = false,
  error = false,
  size = "md",
  className,
}: {
  step: RouteStep;
  complete?: boolean;
  error?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const active = complete ? -1 : step;
  const node = size === "sm" ? 26 : 32;
  const top = node / 2 - 1;
  const fill = complete ? 100 : (step / 2) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute h-0.5 rounded-full bg-line"
          style={{ left: "16.666%", right: "16.666%", top }}
        />
        <div
          aria-hidden="true"
          className={cn(
            "absolute h-0.5 origin-left rounded-full transition-[transform,background-color] duration-[var(--dur-route)]",
            error ? "bg-stop" : complete ? "bg-go" : "bg-accent",
          )}
          style={{
            left: "16.666%",
            width: "66.666%",
            top,
            transform: `scaleX(${fill / 100})`,
            transitionTimingFunction: "var(--ease)",
          }}
        />
        <ol className="relative grid grid-cols-3" aria-label="Download route">
          {STEPS.map((label, index) => {
            const isComplete = complete || index < step;
            const isActive = index === active;
            const isError = error && isActive;
            return (
              <li
                key={label}
                aria-current={isActive ? "step" : undefined}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full border-2 text-[12px] font-extrabold transition-colors",
                    isComplete && complete && "border-go bg-go text-ground",
                    isComplete && !complete && "border-accent bg-accent text-onaccent",
                    isActive && !isError && "border-accent bg-surface text-brand ring-4 ring-accentwash",
                    isError && "border-stop bg-stop text-ground",
                    !isComplete && !isActive && "border-line bg-surface text-muted",
                  )}
                  style={{ width: node, height: node }}
                >
                  {isComplete ? (
                    <Icon name="check" size={size === "sm" ? 13 : 15} strokeWidth={2.6} className="stamp-in" />
                  ) : isError ? (
                    <Icon name="close" size={size === "sm" ? 12 : 14} strokeWidth={2.6} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-center text-[12px] font-semibold leading-none",
                    isComplete && complete && "text-go",
                    isComplete && !complete && "text-ink",
                    isActive && !isError && "text-ink",
                    isError && "text-stop",
                    !isComplete && !isActive && "text-muted",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
