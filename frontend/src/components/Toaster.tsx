import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { cn } from "../lib/utils";

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "ok" | "err" | "info";
}

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Minimal sonner-spirit toaster: bottom-right stack, auto-dismiss, no dependency. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]); // oldest of three leaves as the new one lands
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+66px)] z-50 flex w-[min(92vw,360px)] flex-col gap-2 md:bottom-4"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "sleeve toast-in pointer-events-auto rounded-sm border-l p-3 shadow-lg",
              t.tone === "ok" && "border-l-fixer",
              t.tone === "err" && "border-l-grease",
              t.tone === "info" && "border-l-amber",
            )}
          >
            <p className="text-sm font-semibold text-ink">{t.title}</p>
            {t.body && <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.body}</p>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
