import { Brain, Gamepad2, GitBranch, Globe, Megaphone, Palette, ShieldCheck, Trophy, Zap, type LucideIcon } from "lucide-react";
import { getVertical, type VerticalIconKey } from "@/lib/verticals";

const ICONS: Record<VerticalIconKey, LucideIcon> = {
  brain: Brain,
  gamepad: Gamepad2,
  trophy: Trophy,
  shield: ShieldCheck,
  zap: Zap,
  palette: Palette,
  globe: Globe,
  "git-branch": GitBranch,
  megaphone: Megaphone,
};

export function verticalIcon(slug: string): LucideIcon {
  const v = getVertical(slug);
  return v ? ICONS[v.icon] : Globe;
}

export default function VerticalIcon({ slug, className = "h-4 w-4" }: { slug: string; className?: string }) {
  const Icon = verticalIcon(slug);
  return <Icon className={className} aria-hidden />;
}
