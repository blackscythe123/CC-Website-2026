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
  { slug: "ai-ml", name: "AI / ML", domain: "cc-ai-ml-portal.vercel.app", icon: "brain" },
  { slug: "ar-vr-game-dev", name: "AR, VR & Game Dev", domain: "cc-ar-vr-portal.vercel.app", icon: "gamepad" },
  { slug: "competitive-programming", name: "Competitive Programming", domain: "cc-cp-portal.vercel.app", icon: "trophy" },
  { slug: "cybersecurity", name: "Cyber Security", domain: "cc-cybersecurity-portal.vercel.app", icon: "shield" },
  { slug: "ssnhacks", name: "SSN Hacks", domain: "cc-ssnhacks-portal.vercel.app", icon: "zap" },
  { slug: "design-ui-ux", name: "Design & UI/UX", domain: "cc-design-portal.vercel.app", icon: "palette" },
  { slug: "full-stack", name: "Full Stack", domain: "cc-full-stack-portal.vercel.app", icon: "globe" },
  { slug: "open-source", name: "Open Source (OSS)", domain: "cc-oss-portal.vercel.app", icon: "git-branch" },
];

export const CLUB_VERTICAL: VerticalOption = {
  slug: "club",
  name: "Club Announcements",
  domain: "cc-main-portal.vercel.app",
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
