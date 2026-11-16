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

/**
 * Whether the signed-in user may approve / request changes on a PR. Mirrors the reviews API:
 * the reviewer's role is their role IN THE PR's VERTICAL (superadmin counts everywhere, and
 * `club` has no vertical roles so only superadmins qualify); nobody reviews their own PR;
 * a superadmin may review any other author, a head member/deputy authors, a deputy member authors.
 * `authorRole` null (role lists not loaded) is treated as a member; the server re-checks anyway.
 */
export function canReviewPr(
  viewer: { login: string; role: UserRoleType; rolesByVertical?: Record<string, UserRoleType> } | null | undefined,
  pr: { author: string; vertical: string },
  authorRole: UserRoleType | null
): boolean {
  if (!viewer) return false;
  if (pr.author.toLowerCase() === viewer.login.toLowerCase()) return false;
  const reviewerRole: UserRoleType | null = viewer.role === "superadmin" ? "superadmin" : viewer.rolesByVertical?.[pr.vertical] ?? null;
  const author = authorRole ?? "member";
  switch (reviewerRole) {
    case "superadmin":
      return true;
    case "vertical_head":
      return author === "member" || author === "deputy";
    case "deputy":
      return author === "member";
    default:
      return false;
  }
}
