import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Icon } from "./Icon";

/** Standard select in a wrapper so the chevron stays visible in both themes. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className={cn("relative w-full", className)}>
        <select
          ref={ref}
          className={cn(
            "h-[52px] w-full appearance-none rounded-field border border-line-strong bg-surface pl-4 pr-11 text-base text-ink",
            "hover:border-muted focus:border-accent",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          {...props}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    );
  },
);
