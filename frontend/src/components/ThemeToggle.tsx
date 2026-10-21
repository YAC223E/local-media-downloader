import { Button } from "./ui/button";
import { Icon } from "./ui/Icon";
import { useTheme } from "../lib/theme";

/** System → Dark → Light cycle; persisted, follows the OS in System mode. */
export function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const label =
    mode === "system"
      ? "Theme: System. Switch to Dark."
      : mode === "dark"
        ? "Theme: Dark. Switch to Light."
        : "Theme: Light. Switch to System.";
  return (
    <Button variant="ghost" size="sm" aria-label={label} title={label} onClick={cycle} className="h-11 w-11 px-0">
      <Icon name={mode === "system" ? "monitor" : mode === "dark" ? "sun" : "moon"} size={19} />
    </Button>
  );
}
