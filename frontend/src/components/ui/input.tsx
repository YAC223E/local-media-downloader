import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-field border border-line-strong bg-surface px-3.5 text-[15px] text-ink",
          "placeholder:text-muted hover:border-muted focus:border-ink",
          "disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted",
          className,
        )}
        {...props}
      />
    );
  },
);
