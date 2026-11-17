import { cn } from "../lib/utils";
import { Icon } from "./ui/Icon";
import { useTheme } from "../lib/theme";

/** System → Dark → Light cycle; persisted, follows the OS in System mode. */
export function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "row"; className?: string }) {
  const { mode, cycle } = useTheme();
  const name = mode === "system" ? "System" : mode === "dark" ? "Dark" : "Light";
  const label =
    mode === "system"
      ? "Theme: System. Switch to Dark."
      : mode === "dark"
        ? "Theme: Dark. Switch to Light."
        : "Theme: Light. Switch to System.";

  if (variant === "row") {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={cycle}
        className={cn(
          "pressable flex min-h-11 w-full items-center gap-2 rounded-[8px] px-2 text-left text-muted hover:bg-surface2 hover:text-ink",
          className,
        )}
      >
        <Icon name={mode === "system" ? "monitor" : mode === "dark" ? "sun" : "moon"} size={16} />
        <span className="flex-1 text-[13px] font-medium">Theme</span>
        <span className="mono text-[11px] uppercase tracking-[0.08em] text-faint">{name}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={cycle}
      className={cn(
        "pressable grid h-11 w-11 place-items-center rounded-[9px] text-muted hover:bg-surface2 hover:text-ink",
        className,
      )}
    >
      <Icon name={mode === "system" ? "monitor" : mode === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
