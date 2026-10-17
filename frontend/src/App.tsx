import { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { api, type AppSettings, type SystemStatus } from "./lib/api";
import { JobsProvider, useJobs } from "./lib/jobs";
import { ThemeProvider } from "./lib/theme";
import { Home } from "./pages/Home";
import { Downloads } from "./pages/Downloads";
import { History } from "./pages/History";
import { Settings } from "./pages/Settings";
import { StatusStrip } from "./components/StatusStrip";
import { ThemeToggle } from "./components/ThemeToggle";
import { ToastProvider } from "./components/Toaster";
import { cn } from "./lib/utils";

const NAV = [
  { to: "/", label: "Home", end: true, icon: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" /> },
  {
    to: "/downloads",
    label: "Downloads",
    badge: true,
    icon: <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" />,
  },
  {
    to: "/history",
    label: "History",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
        <path d="M3.5 9.5h17M7 5v4.5" />
      </>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.8v2.5M12 18.7v2.5M2.8 12h2.5M18.7 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" />
      </>
    ),
  },
];

/** Shell: rail on desktop, 4-tab bottom bar on mobile, then the work area. */
function Shell() {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), []);
  const { activeCount } = useJobs();
  const location = useLocation();

  useEffect(() => {
    api.system().then(setSystem).catch(() => {});
    api.settings().then(setSettings).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-dvh bg-ground text-ink">
      <nav aria-label="Primary" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-hairline bg-panel p-3 md:flex">
        <Wordmark />
        <div className="mt-4 grid gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "pressable flex items-center gap-3 rounded-sm border px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive ? "border-amber/70 bg-[var(--wash)] text-ink" : "border-transparent text-muted hover:text-ink",
                )
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                {n.icon}
              </svg>
              {n.label}
              {"badge" in n && activeCount > 0 ? (
                <span className="mono ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1 text-[11px] font-bold text-onamber">
                  {activeCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
        <p className="mono mt-auto px-1 text-[10px] uppercase leading-relaxed tracking-[0.16em] text-muted">
          stays on this laptop
        </p>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <StatusStrip>
          <span className={system?.ffmpeg ? "text-fixer" : "text-grease"}>
            {system ? (system.ffmpeg ? "● ready" : "● video helper missing") : "○ starting…"}
          </span>
          {system && system.urls.length > 0 && (
            <span className="truncate normal-case tracking-normal">LAN · {system.urls.join(" · ")}</span>
          )}
          <span className="ml-auto hidden sm:inline">contact sleeve · {new Date().getFullYear()}</span>
        </StatusStrip>

        <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <span className="md:hidden">
            <Wordmark compact />
          </span>
          <h1 className="sr-only">Local Media Downloader</h1>
          <div className="ml-auto flex items-center gap-2">
            {system && system.urls.length > 0 && (
              <span className="mono hidden rounded-sm border border-hairline px-2 py-1 text-[11px] text-muted lg:inline">
                on your phone, open → {system.urls[0]}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 pb-32 md:pb-8">
          <div key={location.pathname} className="page-in">
            <Routes location={location}>
              <Route path="/" element={<Home settings={settings} onLaunched={bumpHistory} />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/history" element={<History refreshKey={historyTick} />} />
              <Route path="/settings" element={<Settings onSaved={setSettings} />} />
            </Routes>
          </div>
        </main>

        <nav
          aria-label="Primary mobile"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-hairline bg-panel md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "pressable relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold",
                  isActive ? "text-amber" : "text-muted",
                )
              }
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                {n.icon}
              </svg>
              {n.label}
              {"badge" in n && activeCount > 0 ? (
                <span className="mono absolute right-1/2 top-1 grid h-5 min-w-5 translate-x-6 place-items-center rounded-full bg-amber px-1 text-[10px] font-bold text-onamber">
                  {activeCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-sm bg-amber text-onamber">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path d="M3 9h18M7 5v4M17 5v4" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[14px] font-extrabold tracking-tight">Local Media</span>
          <span className="mono block text-[10px] uppercase tracking-[0.22em] text-muted">downloader</span>
        </span>
      )}
    </div>
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
