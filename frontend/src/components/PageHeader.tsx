import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-balance text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[38px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted sm:text-base">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
