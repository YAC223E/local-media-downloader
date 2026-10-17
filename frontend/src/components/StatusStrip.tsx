import { ReactNode } from "react";

/** Sticky mono status strip (plate-section discipline): engine + LAN at a glance. */
export function StatusStrip({ children }: { children: ReactNode }) {
  return (
    <div className="mono sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-hairline bg-ground/95 px-4 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur">
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="sleeve rounded-sm px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-sm border border-hairline text-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path d="M3 9h18M7 5v4" />
        </svg>
      </div>
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
