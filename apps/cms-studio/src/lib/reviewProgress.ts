import type { UserRoleType } from "@/lib/roles";
import { approvalTarget } from "@/lib/governance";

export interface RoleLists {
  superadmins: string[];
  vertical_heads: Record<string, string[]>;
  deputies: Record<string, string[]>;
  members: Record<string, string[]>;
}

/** The author's role for a PR in a given vertical (anyone not listed counts as a member). */
export function authorRoleIn(roles: RoleLists | null, login: string, vertical: string): UserRoleType | null {
  if (!roles) return null;
  const l = login.toLowerCase();
  const has = (list: string[] | undefined) => (list || []).some((u) => u.toLowerCase() === l);
  if (has(roles.superadmins)) return "superadmin";
  if (has(roles.vertical_heads[vertical])) return "vertical_head";
  if (has(roles.deputies[vertical])) return "deputy";
  return "member";
}

/** Approval progress badge for a PR, based on its author's role (CLAUDE.md §2 quorum rules). */
export function reviewProgress(
  authorRole: UserRoleType | null,
  approvers: string[],
  /** Deputies of the PR's vertical, or null when the viewer cannot load the role lists */
  deputies: string[] | null
): { text: string; tone: "success" | "neutral"; title?: string } {
  const approved = approvers.map((a) => a.toLowerCase());

  if (authorRole === "member") {
    // An open member post can only carry deputy approvals (a head or superadmin approval merges it),
    // so without the deputy list every approver counts.
    const deputySet = deputies ? new Set(deputies.map((d) => d.toLowerCase())) : null;
    const deputyApprovals = deputySet ? approved.filter((a) => deputySet.has(a)).length : approved.length;
    return {
      text: `${deputyApprovals}/2 approvals`,
      tone: deputyApprovals > 0 ? "success" : "neutral",
      title: "or 1 head or superadmin",
    };
  }

  if (authorRole) {
    return { text: `needs ${approvalTarget(authorRole).label}`, tone: approved.length > 0 ? "success" : "neutral" };
  }

  return { text: `${approved.length} approval${approved.length === 1 ? "" : "s"}`, tone: approved.length > 0 ? "success" : "neutral" };
}
