import type { LucideIcon } from "lucide-react";

export type BadgeTone = "info" | "success" | "warning" | "danger" | "neutral" | "accent";

const TONES: Record<BadgeTone, string> = {
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-neutral-bg text-neutral",
  accent: "bg-accent-soft text-accent-strong",
};

export default function Badge({
  tone = "neutral",
  icon: Icon,
  title,
  className = "",
  children,
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
  );
}
