import { Button } from "./ui/button";
import { useTheme } from "../lib/theme";

/** System → Dark → Light cycle; persisted, follows the OS in System mode. */
export function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const label =
    mode === "system" ? "Theme: System (tap for Dark)" : mode === "dark" ? "Theme: Dark (tap for Light)" : "Theme: Light (tap for System)";
  return (
    <Button variant="ghost" aria-label={label} title={label} onClick={cycle} className="h-9 min-w-9 px-2">
      {mode === "system" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 12h9V5" />
          <path d="M12 12h9v7h-9z" fill="currentColor" stroke="none" opacity="0.45" />
        </svg>
      ) : mode === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 13.2A8.2 8.2 0 0 1 10.8 4 8.2 8.2 0 1 0 20 13.2Z" />
        </svg>
      )}
    </Button>
  );
}
