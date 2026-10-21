export interface VerticalOption {
  slug: string;
  name: string;
}

export const ALL_VERTICALS: VerticalOption[] = [
  { slug: "ai-ml", name: "🤖 AI / ML" },
  { slug: "ar-vr-game-dev", name: "🎮 AR, VR & Game Dev" },
  { slug: "competitive-programming", name: "🏆 Competitive Programming" },
  { slug: "cybersecurity", name: "🛡️ Cyber Security" },
  { slug: "ssnhacks", name: "⚡ SSN Hacks" },
  { slug: "design-ui-ux", name: "🎨 Design & UI/UX" },
  { slug: "full-stack", name: "🌐 Full Stack" },
  { slug: "open-source", name: "💻 Open Source (OSS)" },
];

export const CLUB_VERTICAL: VerticalOption = { slug: "club", name: "📢 Coding Club Announcements" };

export function verticalLabel(slug: string): string {
  if (slug === CLUB_VERTICAL.slug) return CLUB_VERTICAL.name;
  return ALL_VERTICALS.find((v) => v.slug === slug)?.name || slug;
}
