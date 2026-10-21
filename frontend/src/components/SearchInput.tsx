import { cn } from "../lib/utils";
import { Icon } from "./ui/Icon";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="search" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-[52px] w-full rounded-field border border-line-strong bg-surface pl-12 pr-12 text-base text-ink placeholder:text-muted hover:border-muted focus:border-accent"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="pressable absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-[9px] text-muted hover:bg-surface2 hover:text-ink"
        >
          <Icon name="close" size={17} />
        </button>
      ) : null}
    </div>
  );
}
