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
            "h-12 w-full appearance-none rounded-field border border-line-strong bg-surface pl-3.5 pr-11 text-[15px] text-ink",
            "hover:border-muted focus:border-ink",
            "disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted",
          )}
          {...props}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={17}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    );
  },
);
