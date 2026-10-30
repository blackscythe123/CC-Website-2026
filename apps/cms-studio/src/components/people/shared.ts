import type { ClubRoles, UserRoleInfo, UserRoleType } from "@/lib/roles";
import { verticalLabel } from "@/lib/verticals";

export const ROLE_LABEL: Record<UserRoleType, string> = {
  superadmin: "Superadmin",
  vertical_head: "Vertical head",
  deputy: "Deputy",
  member: "Member",
};

/** The actor's role inside one vertical (superadmins act everywhere). */
export function actorRoleIn(roleInfo: UserRoleInfo | null, vertical: string): UserRoleType | null {
  if (!roleInfo) return null;
  if (roleInfo.role === "superadmin") return "superadmin";
  return roleInfo.rolesByVertical?.[vertical] ?? (roleInfo.verticals.includes(vertical) ? roleInfo.role : null);
}

/** Human description of someone's current assignment, or null if they have none. */
export function currentAssignment(roles: ClubRoles | null, login: string): string | null {
  if (!roles) return null;
  const l = login.toLowerCase();
  const has = (list: string[] | undefined) => (list || []).some((u) => u.toLowerCase() === l);
  if (has(roles.superadmins)) return "Superadmin (all verticals)";
  for (const [v, list] of Object.entries(roles.vertical_heads)) if (has(list)) return `Vertical head of ${verticalLabel(v)}`;
  for (const [v, list] of Object.entries(roles.deputies)) if (has(list)) return `Deputy in ${verticalLabel(v)}`;
  for (const [v, list] of Object.entries(roles.members)) if (has(list)) return `Member of ${verticalLabel(v)}`;
  return null;
}
