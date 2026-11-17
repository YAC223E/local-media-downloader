import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, type AppSettings, type SystemStatus } from "./lib/api";
import { JobsProvider } from "./lib/jobs";
import { ThemeProvider } from "./lib/theme";
import { Home } from "./pages/Home";
import { DefaultsSheet } from "./components/DefaultsSheet";
import { ThemeToggle } from "./components/ThemeToggle";
import { ToastProvider } from "./components/Toaster";
import { ServiceStatus } from "./components/ServiceStatus";
import { Icon } from "./components/ui/Icon";
import { cn } from "./lib/utils";

const OFFLINE: SystemStatus = { ok: false, ffmpeg: false, lan_ips: [], port: 0, urls: [] };

function Shell() {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), []);
  const location = useLocation();

  const loadSystem = useCallback(() => {
    api
      .system()
      .then(setSystem)
      .catch(() => setSystem(OFFLINE));
  }, []);

  useEffect(() => {
    loadSystem();
    const timer = window.setInterval(loadSystem, 30000);
    return () => window.clearInterval(timer);
  }, [loadSystem]);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    document.title = defaultsOpen ? "Defaults · Local Media Downloader" : "Your shelf · Local Media Downloader";
  }, [defaultsOpen]);

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-ground">
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Wordmark compact />
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <ServiceStatus system={system} onRetry={loadSystem} compact />
            <button
              type="button"
              onClick={() => setDefaultsOpen(true)}
              aria-haspopup="dialog"
              aria-label="Open defaults"
              className="pressable inline-flex h-11 w-11 items-center justify-center gap-2 rounded-[8px] text-[12px] font-semibold text-muted hover:bg-surface2 hover:text-ink sm:w-auto sm:px-2.5"
            >
              <Icon name="settings" size={17} />
              <span className="hidden sm:inline">Defaults</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1240px] px-4 pb-12 pt-1 focus:outline-none sm:px-6 lg:px-8"
      >
        <p className="sr-only" role="status" aria-live="polite">
          {defaultsOpen ? "Defaults open" : "Your shelf"}
        </p>
        <div key={location.pathname} className="page-in">
          <Routes location={location}>
            <Route
              path="/"
              element={<Home settings={settings} onLaunched={bumpHistory} refreshKey={historyTick} />}
            />
            <Route path="/downloads" element={<Navigate to="/" replace />} />
            <Route path="/history" element={<Navigate to="/" replace />} />
            <Route path="/settings" element={<OpenDefaults onOpen={() => setDefaultsOpen(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-2 px-4 pb-8 text-[12px] leading-relaxed text-faint sm:px-6 lg:px-8">
        <span>Private by default. Files stay on your Wi-Fi.</span>
        <span className="mono uppercase tracking-[0.12em]">Laptop → Wi-Fi → Phone</span>
      </footer>

      <DefaultsSheet
        open={defaultsOpen}
        onClose={() => setDefaultsOpen(false)}
        onSaved={setSettings}
        system={system}
      />
    </div>
  );
}

/** Old /settings bookmarks open the sheet over the shelf instead of a dead page. */
function OpenDefaults({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    onOpen();
  }, [onOpen]);
  return <Navigate to="/" replace />;
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Local Media Downloader home"
      className="pressable inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-[8px]"
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-[9px] bg-accent text-onaccent",
          compact ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <svg
          width={compact ? 17 : 19}
          height={compact ? 17 : 19}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3.5v10.5m0 0l-4-4m4 4l4-4" />
          <path d="M4 19h16" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={cn("block font-semibold tracking-[-0.02em] text-ink", compact ? "text-[14px]" : "text-[15px]")}>
          Local Media
        </span>
        <span className="mono mt-1 block text-[11px] uppercase tracking-[0.14em] text-muted">Downloader</span>
      </span>
    </Link>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <JobsProvider>
          <Shell />
        </JobsProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
