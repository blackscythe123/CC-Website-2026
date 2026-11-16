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
      return { label: "the head or a superadmin", deputyApprovalsNeeded: null };
    case "superadmin":
      return { label: "a superadmin", deputyApprovalsNeeded: null };
  }
}

/**
 * Whether the signed-in user may approve (publish) / request changes on a PR. Mirrors the reviews API:
 * the reviewer's role is their role IN THE PR's VERTICAL (superadmin counts everywhere; `club` has no
 * vertical roles so only superadmins qualify). Superadmins and the vertical's Head have full control,
 * including their own requests; a Deputy may review Member work by others; tracks need a Head or Superadmin.
 * `authorRole` null (role lists not loaded) is treated as a member; the server re-checks anyway.
 */
export function canReviewPr(
  viewer: { login: string; role: UserRoleType; rolesByVertical?: Record<string, UserRoleType> } | null | undefined,
  pr: { author: string; vertical: string; kind?: "article" | "track" },
  authorRole: UserRoleType | null
): boolean {
  if (!viewer) return false;
  const reviewerRole: UserRoleType | null = viewer.role === "superadmin" ? "superadmin" : viewer.rolesByVertical?.[pr.vertical] ?? null;
  if (reviewerRole === "superadmin" || reviewerRole === "vertical_head") return true;
  if (pr.author.toLowerCase() === viewer.login.toLowerCase()) return false;
  if (pr.kind === "track") return false;
  const author = authorRole ?? "member";
  switch (reviewerRole) {
    case "deputy":
      return author === "member";
    default:
      return false;
  }
}
