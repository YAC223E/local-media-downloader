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
    "pressable inline-flex items-center justify-center gap-2 rounded-button font-semibold",
    "disabled:cursor-not-allowed disabled:opacity-45",
    variant === "primary" &&
      "bg-accent text-onaccent hover:bg-accenthover disabled:border disabled:border-line disabled:bg-surface2 disabled:text-muted disabled:opacity-100",
    variant === "secondary" && "border border-line-strong bg-surface text-ink hover:border-muted",
    variant === "ghost" && "text-muted hover:bg-surface2 hover:text-ink",
    variant === "danger" && "border border-stop/40 text-stop hover:bg-stopwash",
    size === "sm" && "min-h-[44px] px-3 text-sm",
    size === "md" && "min-h-[48px] px-4 text-[15px]",
    size === "lg" && "min-h-[54px] px-6 text-base",
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(function Button({ variant = "primary", size = "md", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={buttonStyles({ variant, size, className })} {...props} />;
});
