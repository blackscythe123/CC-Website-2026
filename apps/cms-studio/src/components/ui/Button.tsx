"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import Spinner from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-primary-bg border-transparent shadow-card hover:brightness-110",
  secondary: "border-border-strong bg-bg text-text hover:bg-surface-2",
  ghost: "border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-text",
  danger: "border-transparent bg-danger-bg text-danger hover:brightness-95 dark:hover:brightness-125",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-9 gap-2 px-3.5 text-sm",
  lg: "h-11 gap-2 px-5 text-[15px]",
};

export function buttonClasses({ variant = "secondary", size = "md", block = false }: Pick<ButtonProps, "variant" | "size" | "block"> = {}) {
  return [
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    block ? "w-full" : "",
  ].join(" ");
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, icon: Icon, iconRight: IconRight, block, className = "", children, disabled, type = "button", ...rest },
  ref
) {
  const iconSize = size === "lg" ? "h-[18px] w-[18px]" : "h-4 w-4";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses({ variant, size, block })} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : Icon ? <Icon className={iconSize} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight className={iconSize} aria-hidden /> : null}
    </button>
  );
});

export default Button;
