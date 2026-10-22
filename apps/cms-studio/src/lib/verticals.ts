export type VerticalIconKey =
  | "brain"
  | "gamepad"
  | "trophy"
  | "shield"
  | "zap"
  | "palette"
  | "globe"
  | "git-branch"
  | "megaphone";

export interface VerticalOption {
  slug: string;
  name: string;
  /** Portal domain, kept in sync with content/club/portals.json (see verticals.test.ts) */
  domain: string;
  icon: VerticalIconKey;
}

export const ALL_VERTICALS: VerticalOption[] = [
  { slug: "ai-ml", name: "AI / ML", domain: "ai.codingclub.tech", icon: "brain" },
  { slug: "ar-vr-game-dev", name: "AR, VR & Game Dev", domain: "arvr.codingclub.tech", icon: "gamepad" },
  { slug: "competitive-programming", name: "Competitive Programming", domain: "cp.codingclub.tech", icon: "trophy" },
  { slug: "cybersecurity", name: "Cyber Security", domain: "cybersecurity.codingclub.tech", icon: "shield" },
  { slug: "ssnhacks", name: "SSN Hacks", domain: "hacks.codingclub.tech", icon: "zap" },
  { slug: "design-ui-ux", name: "Design & UI/UX", domain: "design.codingclub.tech", icon: "palette" },
  { slug: "full-stack", name: "Full Stack", domain: "web.codingclub.tech", icon: "globe" },
  { slug: "open-source", name: "Open Source (OSS)", domain: "oss.codingclub.tech", icon: "git-branch" },
];

export const CLUB_VERTICAL: VerticalOption = {
  slug: "club",
  name: "Club Announcements",
  domain: "codingclub.tech",
  icon: "megaphone",
};

/** Public site that serves /blog/[vertical]/[slug]. */
export const MAIN_PORTAL_URL = (
  process.env.NEXT_PUBLIC_MAIN_PORTAL_URL || "https://ssn-coding-club-wine.vercel.app"
).replace(/\/$/, "");

export function getVertical(slug: string): VerticalOption | undefined {
  if (slug === CLUB_VERTICAL.slug) return CLUB_VERTICAL;
  return ALL_VERTICALS.find((v) => v.slug === slug);
}

export function verticalLabel(slug: string): string {
  return getVertical(slug)?.name || slug;
}

export function publicPostUrl(vertical: string, slug: string): string {
  return `${MAIN_PORTAL_URL}/blog/${vertical}/${slug}`;
}
