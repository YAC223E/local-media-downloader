import type { ReactNode } from "react";
import { Icon, type IconName } from "./ui/Icon";

export function EmptyState({
  title,
  body,
  action,
  icon = "download",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-field bg-accentwash text-brand">
        <Icon name={icon} size={24} />
      </div>
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-[46ch] text-[15px] leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
