/** Class names for buttons and button-styled links. Plain module so server components can use it. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";


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

export function buttonClasses({ variant = "secondary", size = "md", block = false }: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean } = {}) {
  return [
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    block ? "w-full" : "",
  ].join(" ");
}
