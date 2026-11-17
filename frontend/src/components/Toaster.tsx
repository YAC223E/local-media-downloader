import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/utils";
import { Icon } from "./ui/Icon";

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "ok" | "err" | "info";
}

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Minimal toaster: top on phones, bottom-right on desktop, auto-dismiss. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());

  const clearTimer = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const startTimer = useCallback(
    (id: number) => {
      clearTimer(id);
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
      timers.current.set(id, timer);
    },
    [clearTimer],
  );

  const pause = useCallback((id: number) => clearTimer(id), [clearTimer]);
  const resume = useCallback(
    (id: number) => {
      if (!timers.current.has(id)) startTimer(id);
    },
    [startTimer],
  );

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      startTimer(id);
    },
    [startTimer],
  );

  useEffect(() => {
    const current = timers.current;
    return () => {
      current.forEach((timer) => window.clearTimeout(timer));
      current.clear();
    };
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+72px)] z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:w-[380px]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => pause(toast.id)}
            onMouseLeave={() => resume(toast.id)}
            onFocusCapture={() => pause(toast.id)}
            onBlurCapture={() => resume(toast.id)}
            className="toast-in pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-surface p-3 shadow-float"
          >
            <span
              className={cn(
                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[8px]",
                toast.tone === "ok" && "bg-gowash text-go",
                toast.tone === "err" && "bg-stopwash text-stop",
                toast.tone === "info" && "bg-accentwash text-brand",
              )}
            >
              <Icon
                name={toast.tone === "ok" ? "check" : toast.tone === "err" ? "alert" : "info"}
                size={17}
                strokeWidth={toast.tone === "ok" ? 2.3 : 1.9}
              />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[14px] font-semibold leading-snug text-ink">{toast.title}</p>
              {toast.body ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{toast.body}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="pressable -mr-1.5 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-muted hover:bg-surface2 hover:text-ink"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
