import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";

/** Standard button in the sleeve vocabulary: filled ink, hairline outline, quiet ghost. */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "primary", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold",
        "pressable disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-amber text-onamber hover:bg-amberdeep",
        variant === "outline" && "border border-hairline bg-transparent text-ink hover:border-amber hover:text-amber",
        variant === "ghost" && "text-muted hover:text-ink",
        variant === "danger" && "border border-grease/60 text-grease hover:bg-grease/10",
        className,
      )}
      {...props}
    />
  );
});
