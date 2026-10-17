import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-sm border border-hairline bg-panel px-4 text-[15px] text-ink",
          "placeholder:text-muted hover:border-muted focus:border-amber focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);
