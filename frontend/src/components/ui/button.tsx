import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "pressable inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-button font-semibold",
    "disabled:cursor-not-allowed disabled:opacity-45",
    variant === "primary" &&
      "border border-accent bg-accent text-onaccent hover:border-accenthover hover:bg-accenthover disabled:border-line disabled:bg-surface2 disabled:text-muted disabled:opacity-100",
    variant === "secondary" && "border border-line-strong bg-surface text-ink hover:border-ink hover:bg-surface2",
    variant === "ghost" && "border border-transparent text-muted hover:bg-surface2 hover:text-ink",
    variant === "danger" && "border border-stop/40 bg-transparent text-stop hover:border-stop hover:bg-stopwash",
    size === "sm" && "min-h-11 px-3.5 text-[13px]",
    size === "md" && "min-h-12 px-4 text-sm",
    size === "lg" && "min-h-[52px] px-5 text-[15px]",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}>(function Button({ variant = "primary", size = "md", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={buttonStyles({ variant, size, className })} {...props} />;
});
