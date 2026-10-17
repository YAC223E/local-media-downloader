import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

/** Standard select in the sleeve vocabulary: same field family as Input. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-12 w-full rounded-sm border border-hairline bg-panel px-3 text-[15px] text-ink",
          "hover:border-muted focus:border-amber cursor-pointer",
          className,
        )}
        {...props}
      />
    );
  },
);
