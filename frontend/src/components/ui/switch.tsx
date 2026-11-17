import { cn } from "../../lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "pressable inline-flex h-11 w-14 shrink-0 items-center justify-center",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-[27px] w-[46px] items-center rounded-pill border p-[2px]",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface2",
        )}
      >
        <span
          className={cn(
            "h-[21px] w-[21px] rounded-full border transition-transform duration-150",
            checked
              ? "translate-x-[19px] border-onaccent/20 bg-onaccent"
              : "translate-x-0 border-line-strong/40 bg-surface",
          )}
        />
      </span>
    </button>
  );
}

export function SwitchRow({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-ink">{label}</p>
        {description ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}
