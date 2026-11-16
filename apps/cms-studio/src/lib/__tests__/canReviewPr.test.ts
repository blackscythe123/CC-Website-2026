import { describe, expect, it } from "vitest";
import { canReviewPr } from "@/lib/governance";
import type { UserRoleType } from "@/lib/roles";

const viewer = (role: UserRoleType, rolesByVertical: Record<string, UserRoleType> = {}, login = "me") => ({ login, role, rolesByVertical });
const pr = (author: string, vertical = "ai-ml") => ({ author, vertical });

describe("canReviewPr (role in the PR's vertical + author's role)", () => {
  it("nobody reviews their own PR, whatever their role or case", () => {
    expect(canReviewPr(viewer("superadmin"), pr("ME"), "superadmin")).toBe(false);
    expect(canReviewPr(viewer("vertical_head", { "ai-ml": "vertical_head" }), pr("me"), "vertical_head")).toBe(false);
  });

  it("superadmin reviews any other author, in any vertical including club", () => {
    for (const a of ["member", "deputy", "vertical_head", "superadmin"] as const) {
      expect(canReviewPr(viewer("superadmin"), pr("x", "club"), a)).toBe(true);
      expect(canReviewPr(viewer("superadmin"), pr("x", "cybersecurity"), a)).toBe(true);
    }
  });

  it("head reviews member/deputy authors in their own vertical only", () => {
    const head = viewer("vertical_head", { "ai-ml": "vertical_head" });
    expect(canReviewPr(head, pr("x"), "member")).toBe(true);
    expect(canReviewPr(head, pr("x"), "deputy")).toBe(true);
    expect(canReviewPr(head, pr("x"), "vertical_head")).toBe(false);
    expect(canReviewPr(head, pr("x"), "superadmin")).toBe(false);
    expect(canReviewPr(head, pr("x", "cybersecurity"), "member")).toBe(false);
    expect(canReviewPr(head, pr("x", "club"), "member")).toBe(false);
  });

  it("deputy reviews member authors only", () => {
    const dep = viewer("deputy", { "ai-ml": "deputy" });
    expect(canReviewPr(dep, pr("x"), "member")).toBe(true);
    expect(canReviewPr(dep, pr("x"), "deputy")).toBe(false);
    expect(canReviewPr(dep, pr("x"), "vertical_head")).toBe(false);
    expect(canReviewPr(dep, pr("x", "full-stack"), "member")).toBe(false);
  });

  it("uses the role IN the PR's vertical, not the highest role overall", () => {
    // head of ai-ml but only a deputy in full-stack
    const mixed = viewer("vertical_head", { "ai-ml": "vertical_head", "full-stack": "deputy" });
    expect(canReviewPr(mixed, pr("x", "full-stack"), "deputy")).toBe(false);
    expect(canReviewPr(mixed, pr("x", "full-stack"), "member")).toBe(true);
    expect(canReviewPr(mixed, pr("x", "ai-ml"), "deputy")).toBe(true);
  });

  it("members and signed-out users never review; unknown author role counts as member", () => {
    expect(canReviewPr(viewer("member", { "ai-ml": "member" }), pr("x"), "member")).toBe(false);
    expect(canReviewPr(null, pr("x"), "member")).toBe(false);
    expect(canReviewPr(viewer("deputy", { "ai-ml": "deputy" }), pr("x"), null)).toBe(true);
  });
});
