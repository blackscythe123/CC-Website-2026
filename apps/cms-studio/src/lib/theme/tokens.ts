/**
 * Single source of truth for Studio colours. globals.css declares the same values
 * (enforced by theme.css.test.ts) and every pair below is contrast-checked
 * (theme.contrast.test.ts).
 */
export type ThemeName = "light" | "dark";

export type TokenName =
  | "bg"
  | "surface"
  | "surface-2"
  | "border"
  | "border-strong"
  | "text"
  | "muted"
  | "subtle"
  | "accent"
  | "accent-strong"
  | "accent-soft"
  | "on-accent"
  | "primary"
  | "primary-2"
  | "info"
  | "info-bg"
  | "success"
  | "success-bg"
  | "warning"
  | "warning-bg"
  | "danger"
  | "danger-bg"
  | "neutral"
  | "neutral-bg";

export const TOKENS: Record<ThemeName, Record<TokenName, string>> = {
  light: {
    bg: "#FFFFFF",
    surface: "#FAFAFA",
    "surface-2": "#F4F4F5",
    border: "#E4E4E7",
    "border-strong": "#D4D4D8",
    text: "#18181B",
    muted: "#52525B",
    subtle: "#71717A",
    accent: "#E11D48",
    "accent-strong": "#BE123C",
    "accent-soft": "#FFF1F2",
    "on-accent": "#FFFFFF",
    primary: "#E11D48",
    "primary-2": "#E11D48",
    info: "#1D4ED8",
    "info-bg": "#EFF6FF",
    success: "#047857",
    "success-bg": "#ECFDF5",
    warning: "#B45309",
    "warning-bg": "#FFFBEB",
    danger: "#B91C1C",
    "danger-bg": "#FEF2F2",
    neutral: "#3F3F46",
    "neutral-bg": "#F4F4F5",
  },
  dark: {
    bg: "#0B0B0F",
    surface: "#131318",
    "surface-2": "#1C1C22",
    border: "#2A2A31",
    "border-strong": "#3A3A42",
    text: "#F4F4F5",
    muted: "#A1A1AA",
    subtle: "#8B8B94",
    accent: "#FB7185",
    "accent-strong": "#FDA4AF",
    "accent-soft": "#2A0F17",
    "on-accent": "#FFFFFF",
    primary: "#E11D48",
    "primary-2": "#9333EA",
    info: "#93C5FD",
    "info-bg": "#172554",
    success: "#86EFAC",
    "success-bg": "#052E16",
    warning: "#FCD34D",
    "warning-bg": "#3A2405",
    danger: "#FCA5A5",
    "danger-bg": "#3B0A0A",
    neutral: "#D4D4D8",
    "neutral-bg": "#27272A",
  },
};

export const CONTRAST_PAIRS: { fg: TokenName; bg: TokenName; min: number; label: string }[] = [
  { fg: "text", bg: "bg", min: 4.5, label: "text on bg" },
  { fg: "text", bg: "surface", min: 4.5, label: "text on surface" },
  { fg: "text", bg: "surface-2", min: 4.5, label: "text on surface-2" },
  { fg: "muted", bg: "bg", min: 4.5, label: "muted on bg" },
  { fg: "muted", bg: "surface", min: 4.5, label: "muted on surface" },
  { fg: "muted", bg: "surface-2", min: 4.5, label: "muted on surface-2" },
  { fg: "subtle", bg: "bg", min: 4.5, label: "subtle on bg" },
  { fg: "accent", bg: "bg", min: 4.5, label: "accent on bg" },
  { fg: "accent", bg: "surface", min: 4.5, label: "accent on surface" },
  { fg: "on-accent", bg: "primary", min: 4.5, label: "button text on primary" },
  { fg: "on-accent", bg: "primary-2", min: 4.5, label: "button text on primary-2" },
  { fg: "accent-strong", bg: "accent-soft", min: 4.5, label: "accent-strong on accent-soft" },
  { fg: "info", bg: "info-bg", min: 4.5, label: "info badge" },
  { fg: "success", bg: "success-bg", min: 4.5, label: "success badge" },
  { fg: "warning", bg: "warning-bg", min: 4.5, label: "warning badge" },
  { fg: "danger", bg: "danger-bg", min: 4.5, label: "danger badge" },
  { fg: "neutral", bg: "neutral-bg", min: 4.5, label: "neutral badge" },
  { fg: "danger", bg: "bg", min: 4.5, label: "danger text on bg" },
  { fg: "border-strong", bg: "bg", min: 1.3, label: "input border on bg" },
];
