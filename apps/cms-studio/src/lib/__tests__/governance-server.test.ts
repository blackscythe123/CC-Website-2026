import { describe, expect, it } from "vitest";
import {
  validateArticlePRFiles,
  evaluateReviewerAuthority,
  countDeputyApprovals,
  roleInVertical,
} from "@/lib/github";
import { checkRoleChangeAllowed, normalizeClubRoles } from "@/lib/roles";

describe("validateArticlePRFiles", () => {
  it("accepts one article plus uploads and derives the vertical from the path", () => {
    expect(
      validateArticlePRFiles(["content/verticals/ai-ml/posts/intro.md", "apps/main-portal/public/uploads/1-a.png"])
    ).toEqual({ ok: true, articlePath: "content/verticals/ai-ml/posts/intro.md", vertical: "ai-ml" });
    expect(validateArticlePRFiles(["content/club/posts/news.md"])).toMatchObject({ ok: true, vertical: "club" });
  });
  it("rejects PRs that touch governance, workflows or code", () => {
    for (const extra of ["content/club/roles.json", ".github/workflows/x.yml", "apps/cms-studio/src/lib/roles.ts"]) {
      expect(validateArticlePRFiles(["content/verticals/ai-ml/posts/intro.md", extra]).ok).toBe(false);
    }
  });
  it("rejects zero or multiple articles", () => {
    expect(validateArticlePRFiles(["apps/main-portal/public/uploads/a.png"]).ok).toBe(false);
    expect(
      validateArticlePRFiles(["content/verticals/ai-ml/posts/a.md", "content/verticals/ai-ml/posts/b.md"]).ok
    ).toBe(false);
  });
});

describe("evaluateReviewerAuthority (quorum rules)", () => {
  it("superadmin can approve anything", () => {
    expect(evaluateReviewerAuthority("superadmin", "superadmin")).toBe("merge");
  });
  it("head merges member and deputy articles but not head or superadmin articles", () => {
    expect(evaluateReviewerAuthority("vertical_head", "member")).toBe("merge");
    expect(evaluateReviewerAuthority("vertical_head", "deputy")).toBe("merge");
    expect(evaluateReviewerAuthority("vertical_head", "vertical_head")).not.toMatch(/^(merge|count)/);
    expect(evaluateReviewerAuthority("vertical_head", "superadmin")).not.toMatch(/^(merge|count)/);
  });
  it("deputies only count toward member articles", () => {
    expect(evaluateReviewerAuthority("deputy", "member")).toBe("count-deputies");
    expect(evaluateReviewerAuthority("deputy", "deputy")).not.toMatch(/^(merge|count)/);
  });
  it("members and outsiders cannot approve", () => {
    expect(evaluateReviewerAuthority("member", "member")).not.toMatch(/^(merge|count)/);
    expect(evaluateReviewerAuthority("none", "member")).not.toMatch(/^(merge|count)/);
  });
});

describe("roleInVertical", () => {
  it("uses the role in that vertical, not the highest role elsewhere", () => {
    const info = { role: "vertical_head", rolesByVertical: { "full-stack": "vertical_head", "ai-ml": "deputy" } };
    expect(roleInVertical(info, "ai-ml")).toBe("deputy");
    expect(roleInVertical(info, "cybersecurity")).toBe("none");
    expect(roleInVertical({ role: "superadmin" }, "club")).toBe("superadmin");
  });
});

describe("countDeputyApprovals", () => {
  const deputies = ["d1", "d2", "d3"];
  it("counts distinct deputies approving the current head commit only", () => {
    const reviews = [
      { user: { login: "d1" }, state: "APPROVED", commit_id: "old" },
      { user: { login: "d2" }, state: "APPROVED", commit_id: "head" },
      { user: { login: "d2" }, state: "APPROVED", commit_id: "head" },
    ];
    expect(countDeputyApprovals(reviews, "head", deputies, [])).toBe(1);
  });
  it("ignores comment-only reviews and excluded authors", () => {
    const reviews = [
      { user: { login: "d1" }, state: "APPROVED", commit_id: "head" },
      { user: { login: "d1" }, state: "COMMENTED", commit_id: "head" },
      { user: { login: "d3" }, state: "APPROVED", commit_id: "head" },
    ];
    expect(countDeputyApprovals(reviews, "head", deputies, ["d3"])).toBe(1);
  });
});

describe("checkRoleChangeAllowed", () => {
  const roles = normalizeClubRoles({
    superadmins: ["boss"],
    vertical_heads: { "ai-ml": ["headA"], cybersecurity: ["headC"] },
    deputies: { "ai-ml": ["depA", "depA2"] },
    members: { cybersecurity: ["headA"], "ai-ml": ["memA"] },
  });
  it("blocks a head from appointing deputies in a vertical where they are only a member", () => {
    expect(checkRoleChangeAllowed(roles, "headA", "x", "assign", "deputy", "cybersecurity")).not.toBeNull();
    expect(checkRoleChangeAllowed(roles, "headA", "x", "assign", "deputy", "ai-ml")).toBeNull();
  });
  it("blocks a deputy from demoting their head or a peer deputy", () => {
    expect(checkRoleChangeAllowed(roles, "depA", "headA", "assign", "member", "ai-ml")).not.toBeNull();
    expect(checkRoleChangeAllowed(roles, "depA", "depA2", "assign", "member", "ai-ml")).not.toBeNull();
    expect(checkRoleChangeAllowed(roles, "depA", "memA", "remove", "member", "ai-ml")).toBeNull();
  });
  it("only superadmins manage heads, and the last superadmin cannot be removed", () => {
    expect(checkRoleChangeAllowed(roles, "headA", "x", "assign", "vertical_head", "ai-ml")).not.toBeNull();
    expect(checkRoleChangeAllowed(roles, "boss", "x", "assign", "vertical_head", "ai-ml")).toBeNull();
    expect(checkRoleChangeAllowed(roles, "boss", "boss", "remove", "superadmin")).toBe("Cannot remove the last Superadmin.");
  });
});
