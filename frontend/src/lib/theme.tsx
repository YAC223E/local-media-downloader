import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "system" | "dark" | "light";
const KEY = "lmd-theme";

function systemDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
  } catch {
    /* private mode */
  }
  return "system";
}

function apply(mode: ThemeMode): "dark" | "light" {
  const resolved = mode === "system" ? (systemDark() ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#14130f" : "#f3efe4");
  return resolved;
}

interface ThemeCtx {
  mode: ThemeMode;
  resolved: "dark" | "light";
  setMode: (m: ThemeMode) => void;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx>({ mode: "system", resolved: "dark", setMode: () => {}, cycle: () => {} });
export const useTheme = () => useContext(Ctx);

/** Single theme source for the header toggle and Settings. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [resolved, setResolved] = useState<"dark" | "light">(() => apply(readMode()));

  useEffect(() => {
    setResolved(apply(mode));
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((m) => (m === "system" ? "dark" : m === "dark" ? "light" : "system"));
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode, cycle }), [mode, resolved, cycle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
