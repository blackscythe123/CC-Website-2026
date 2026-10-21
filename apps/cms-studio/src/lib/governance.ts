import type { UserRoleType } from "@/lib/roles";

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
