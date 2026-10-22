import type { UserRoleType } from "@/lib/roles";

/** Roles an actor may hand out (mirrors POST /api/roles and the applications review rules). */
export function assignableRoles(actorRole: UserRoleType | null): UserRoleType[] {
  switch (actorRole) {
    case "superadmin":
      return ["member", "deputy", "vertical_head", "superadmin"];
    case "vertical_head":
      return ["member", "deputy"];
    case "deputy":
      return ["member"];
    default:
      return [];
  }
}

/**
 * Whether an actor (by their role in the vertical) may remove someone's role.
 * The last superadmin can never be removed.
 */
export function canRemoveRole(actorRole: UserRoleType | null, targetRole: UserRoleType, superadminCount: number): boolean {
  if (targetRole === "superadmin") return actorRole === "superadmin" && superadminCount > 1;
  if (targetRole === "vertical_head") return actorRole === "superadmin";
  return assignableRoles(actorRole).includes(targetRole);
}

/** Who must approve a post, by the author's role (mirrors CLAUDE.md §2 and the reviews API). */
export function approvalTarget(authorRole: UserRoleType): { label: string; deputyApprovalsNeeded: number | null } {
  switch (authorRole) {
    case "member":
      return { label: "2 deputies, or 1 head or superadmin", deputyApprovalsNeeded: 2 };
    case "deputy":
      return { label: "1 head or superadmin", deputyApprovalsNeeded: null };
    case "vertical_head":
      return { label: "1 superadmin", deputyApprovalsNeeded: null };
    case "superadmin":
      return { label: "another superadmin", deputyApprovalsNeeded: null };
  }
}
