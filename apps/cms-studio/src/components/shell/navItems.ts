import { FileText, SquareCheck, SquarePen, UserPlus, Users, type LucideIcon } from "lucide-react";
import type { UserRoleType } from "@/lib/roles";

export interface NavItem {
  id: "write" | "reviews" | "articles" | "people" | "join";
  href: string;
  label: string;
  icon: LucideIcon;
}

const WRITE: NavItem = { id: "write", href: "/admin", label: "Write", icon: SquarePen };
const REVIEWS: NavItem = { id: "reviews", href: "/admin/reviews", label: "Reviews", icon: SquareCheck };
const ARTICLES: NavItem = { id: "articles", href: "/admin/posts", label: "Articles", icon: FileText };
const PEOPLE: NavItem = { id: "people", href: "/admin/roles", label: "People", icon: Users };
const JOIN: NavItem = { id: "join", href: "/admin/roles", label: "Join a vertical", icon: UserPlus };

/** Sections a role can open (same permissions the old top bar used). */
export function navItemsFor(role: UserRoleType | null, _verticals: string[]): NavItem[] {
  if (!role) return [];
  if (role === "superadmin" || role === "vertical_head") return [WRITE, REVIEWS, ARTICLES, PEOPLE];
  if (role === "deputy") return [WRITE, REVIEWS, PEOPLE];
  return [WRITE, REVIEWS, JOIN];
}

export function isActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
