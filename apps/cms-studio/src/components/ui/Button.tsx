"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import Spinner from "./Spinner";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonClasses";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
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
