import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { api, type AppSettings, type SystemStatus } from "./lib/api";
import { JobsProvider, useJobs } from "./lib/jobs";
import { ThemeProvider } from "./lib/theme";
import { Home } from "./pages/Home";
import { Downloads } from "./pages/Downloads";
import { Library } from "./pages/Library";
import { Settings } from "./pages/Settings";
import { ThemeToggle } from "./components/ThemeToggle";
import { ToastProvider } from "./components/Toaster";
import { PhoneLink, ServiceStatus } from "./components/ServiceStatus";
import { Icon, type IconName } from "./components/ui/Icon";
import { cn } from "./lib/utils";

const NAV: { to: string; label: string; end?: boolean; badge?: boolean; icon: IconName }[] = [
  { to: "/", label: "Home", end: true, icon: "home" },
  { to: "/downloads", label: "Downloads", badge: true, icon: "download" },
  { to: "/history", label: "Library", icon: "library" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const OFFLINE: SystemStatus = { ok: false, ffmpeg: false, lan_ips: [], port: 0, urls: [] };

function Shell() {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), []);
  const { activeCount, readyCount } = useJobs();
  const location = useLocation();
  const pageName =
    location.pathname === "/"
      ? "Home"
      : location.pathname === "/downloads"
        ? "Downloads"
        : location.pathname === "/history"
          ? "Library"
          : location.pathname === "/settings"
            ? "Settings"
            : "Local Media Downloader";

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
    document.title = pageName === "Local Media Downloader" ? pageName : `${pageName} · Local Media Downloader`;
  }, [pageName]);

  return (
    <div className="flex min-h-dvh flex-col bg-ground text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-ground">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Primary" className="ml-3 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "pressable flex min-h-[44px] items-center gap-2 rounded-button px-3 text-sm font-semibold",
                    isActive ? "bg-accentwash text-brand" : "text-muted hover:bg-surface2 hover:text-ink",
                  )
                }
              >
                <Icon name={item.icon} size={18} />
                {item.label}
                {item.badge ? <NavBadges active={activeCount} ready={readyCount} /> : null}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <PhoneLink system={system} />
            <ServiceStatus system={system} onRetry={loadSystem} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10">
        <p className="sr-only" role="status" aria-live="polite">
          {pageName} page
        </p>
        <div key={location.pathname} className="page-in">
          <Routes location={location}>
            <Route path="/" element={<Home settings={settings} onLaunched={bumpHistory} />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/history" element={<Library refreshKey={historyTick} />} />
            <Route path="/settings" element={<Settings onSaved={setSettings} system={system} />} />
          </Routes>
        </div>
      </main>

      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "pressable relative flex min-h-[68px] flex-col items-center justify-center gap-1 px-1 text-[12px] font-semibold",
                  isActive ? "text-brand" : "text-muted",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-accent" /> : null}
                  <span className="relative">
                    <Icon name={item.icon} size={22} />
                    {item.badge ? <NavBadges active={activeCount} ready={readyCount} compact /> : null}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavBadges({ active, ready, compact = false }: { active: number; ready: number; compact?: boolean }) {
  if (!active && !ready) return null;
  return (
    <span className={cn("flex items-center gap-0.5", compact && "absolute -right-4 -top-2")}>
      {active > 0 ? (
        <span
          aria-hidden="true"
          className={cn(
            "grid place-items-center rounded-pill bg-accent font-extrabold text-onaccent",
            compact ? "h-4 min-w-4 px-1 text-[9px]" : "h-5 min-w-5 px-1 text-[11px]",
          )}
        >
          {active}
        </span>
      ) : null}
      {ready > 0 ? (
        <span
          aria-hidden="true"
          title={`${ready} ready to save`}
          className={cn(
            "grid place-items-center rounded-pill bg-go font-extrabold text-ground",
            compact ? "h-4 min-w-4 px-1 text-[9px]" : "h-5 min-w-5 px-1 text-[11px]",
          )}
        >
          {ready}
        </span>
      ) : null}
      <span className="sr-only">
        {active ? `${active} active. ` : ""}
        {ready ? `${ready} ready to save.` : ""}
      </span>
    </span>
  );
}

function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="Local Media Downloader home"
      className="pressable flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-button"
    >
      <span className="grid h-11 w-11 place-items-center rounded-[11px] bg-accent text-onaccent">
        <Icon name="download" size={22} strokeWidth={2.2} />
      </span>
      <span className="leading-[1.05]">
        <span className="block text-[15px] font-extrabold tracking-[-0.02em] text-ink">Local Media</span>
        <span className="block text-[11px] font-semibold text-muted">Downloader</span>
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
