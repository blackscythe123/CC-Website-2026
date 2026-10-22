"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Accessible name; also shown as a tooltip */
  label: string;
  size?: "sm" | "md";
  pressed?: boolean;
  tone?: "default" | "danger";
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = "md", pressed, tone = "default", className = "", type = "button", ...rest },
  ref
) {
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const toneClass =
    tone === "danger"
      ? "text-muted hover:bg-danger-bg hover:text-danger"
      : pressed
      ? "bg-surface-2 text-text"
      : "text-muted hover:bg-surface-2 hover:text-text";
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg transition disabled:opacity-50 ${box} ${toneClass} ${className}`}
      {...rest}
    >
      <Icon className={iconSize} aria-hidden />
    </button>
  );
});

export default IconButton;
