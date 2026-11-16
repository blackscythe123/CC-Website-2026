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
    ).toEqual({ ok: true, kind: "publish", articlePath: "content/verticals/ai-ml/posts/intro.md", vertical: "ai-ml" });
    expect(validateArticlePRFiles(["content/club/posts/news.md"])).toMatchObject({ ok: true, vertical: "club" });
  });
  it("rejects PRs that touch governance, workflows or code", () => {
    for (const extra of ["content/club/roles.json", ".github/workflows/x.yml", "apps/cms-studio/src/lib/roles.ts"]) {
      expect(validateArticlePRFiles(["content/verticals/ai-ml/posts/intro.md", extra]).ok).toBe(false);
    }
  });
  it("only accepts newly added raster images as uploads", () => {
    const art = { filename: "content/verticals/ai-ml/posts/intro.md", status: "added" };
    for (const bad of ["x.html", "x.svg", "x.js", ".htaccess", "x.png.html"]) {
      expect(validateArticlePRFiles([art, { filename: `apps/main-portal/public/uploads/${bad}`, status: "added" }]).ok).toBe(false);
    }
    expect(validateArticlePRFiles([art, { filename: "apps/main-portal/public/uploads/1-a.webp", status: "added" }]).ok).toBe(true);
    // replacing or deleting someone else's existing upload is refused
    expect(validateArticlePRFiles([art, { filename: "apps/main-portal/public/uploads/old.png", status: "modified" }]).ok).toBe(false);
    expect(validateArticlePRFiles([art, { filename: "apps/main-portal/public/uploads/old.png", status: "removed" }]).ok).toBe(false);
  });
  it("recognises an unpublish request: one removed article and nothing else", () => {
    const removed = { filename: "content/verticals/cybersecurity/posts/old.md", status: "removed" };
    expect(validateArticlePRFiles([removed])).toMatchObject({ ok: true, kind: "unpublish", vertical: "cybersecurity" });
    expect(validateArticlePRFiles([removed, { filename: "apps/main-portal/public/uploads/1-a.png", status: "added" }]).ok).toBe(false);
    expect(validateArticlePRFiles([{ filename: "content/verticals/ai-ml/posts/a.md", status: "renamed" }]).ok).toBe(false);
  });
  it("rejects unknown vertical folders", () => {
    expect(validateArticlePRFiles(["content/verticals/fullstack/posts/a.md"]).ok).toBe(false);
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

import {
  summarizeReviewsForHead,
  buildMergeSubject,
  resolveTargetPortals,
  normalizeContentDate,
  assertSafePendingImages,
} from "@/lib/github";

describe("summarizeReviewsForHead", () => {
  it("only counts approvals and change requests on the current head commit", () => {
    const s = summarizeReviewsForHead(
      [
        { user: { login: "d1" }, state: "APPROVED", commit_id: "old" },
        { user: { login: "d2" }, state: "APPROVED", commit_id: "head" },
        { user: { login: "d3" }, state: "CHANGES_REQUESTED", commit_id: "old", body: "fix typos" },
      ],
      "head"
    );
    expect(s.approvers).toEqual(["d2"]);
    expect(s.changesRequested).toBe(false); // feedback was on an older revision
  });
  it("uses each reviewer's latest decisive state and ignores comment-only reviews", () => {
    const s = summarizeReviewsForHead(
      [
        { user: { login: "d1" }, state: "APPROVED", commit_id: "head" },
        { user: { login: "d1" }, state: "COMMENTED", commit_id: "head" },
        { user: { login: "d2" }, state: "APPROVED", commit_id: "head" },
        { user: { login: "d2" }, state: "CHANGES_REQUESTED", commit_id: "head", body: "needs sources" },
      ],
      "head"
    );
    expect(s.approvers).toEqual(["d1"]);
    expect(s.changesRequested).toBe(true);
    expect(s.latestFeedback).toBe("needs sources");
  });
});

describe("buildMergeSubject", () => {
  it("builds the subject server-side, ignoring the editable PR title", () => {
    expect(buildMergeSubject("publish", "ai-ml", "Intro to\nTransformers", "intro", 7)).toBe("feat(ai-ml): Intro to Transformers (#7)");
    expect(buildMergeSubject("unpublish", "cybersecurity", "", "old-post", 8)).toBe("chore(cybersecurity): unpublish old-post (#8)");
  });
  it("caps long titles so the commit check (max 24 words) passes", () => {
    const subject = buildMergeSubject("publish", "cp", Array(40).fill("word").join(" "), "x", 9);
    expect(subject.split(/\s+/).length).toBeLessThanOrEqual(24);
  });
});

describe("resolveTargetPortals", () => {
  it("always includes the main portal and the article's own vertical portal", () => {
    expect(resolveTargetPortals("full-stack", ["main-portal"])).toEqual(["main-portal", "full-stack-portal"]);
    expect(resolveTargetPortals("open-source", undefined)).toEqual(["main-portal", "oss-portal"]);
    expect(resolveTargetPortals("club", [])).toEqual(["main-portal"]);
  });
  it("drops unknown portal ids", () => {
    expect(resolveTargetPortals("ai-ml", ["evil-portal", "cp-portal"])).toEqual(["main-portal", "ai-ml-portal", "cp-portal"]);
  });
});

describe("normalizeContentDate", () => {
  it("turns YAML Date objects into YYYY-MM-DD", () => {
    expect(normalizeContentDate(new Date("2026-10-10T00:00:00Z"))).toBe("2026-10-10");
    expect(normalizeContentDate("2026-10-10T12:00:00Z")).toBe("2026-10-10");
    expect(normalizeContentDate(undefined)).toBe("");
  });
});

describe("assertSafePendingImages", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");
  it("accepts real images and rejects disguised or oversized files", () => {
    expect(() => assertSafePendingImages([{ filename: "a.png", base64: png, placeholderUrl: "blob:x" }])).not.toThrow();
    expect(() => assertSafePendingImages([{ filename: "a.svg", base64: png, placeholderUrl: "blob:x" }])).toThrow(/rejected/);
    expect(() =>
      assertSafePendingImages([{ filename: "a.png", base64: Buffer.from("<script>").toString("base64"), placeholderUrl: "blob:x" }])
    ).toThrow(/rejected/);
    const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(3 * 1024 * 1024)]).toString("base64");
    expect(() => assertSafePendingImages([{ filename: "big.png", base64: big, placeholderUrl: "blob:x" }])).toThrow(/rejected/);
  });
});

import { assertCompletePRListing, editorialRank } from "@/lib/github";
import { getSessionToken, isSameOriginJsonRequest, sealSession } from "@/lib/session";
import { NextRequest } from "next/server";

describe("assertCompletePRListing", () => {
  it("refuses truncated or oversized file and commit listings", () => {
    expect(assertCompletePRListing({ changed_files: 2, commits: 1 }, 2, 1)).toBeNull();
    expect(assertCompletePRListing({ changed_files: 3001, commits: 1 }, 3000, 1)).not.toBeNull(); // GitHub cut-off
    expect(assertCompletePRListing({ changed_files: 41, commits: 1 }, 41, 1)).not.toBeNull();
    expect(assertCompletePRListing({ changed_files: 2, commits: 260 }, 2, 250)).not.toBeNull();
    expect(assertCompletePRListing({}, 2, 1)).not.toBeNull();
  });
  it("ranks roles", () => {
    expect(editorialRank("vertical_head")).toBeGreaterThan(editorialRank("deputy"));
  });
});

describe("CSRF guard for cookie sessions", () => {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret-for-unit-tests";
  const cookie = () => `cc_token=${sealSession({ token: "gho_test", login: "u" })}`;
  const req = (method: string, headers: Record<string, string>) =>
    new NextRequest("https://studio.example/api/roles", { method, headers: { host: "studio.example", cookie: cookie(), ...headers } });

  it("accepts same-origin JSON writes and plain reads", () => {
    expect(getSessionToken(req("POST", { origin: "https://studio.example", "content-type": "application/json" }))).toBe("gho_test");
    expect(getSessionToken(req("GET", {}))).toBe("gho_test");
  });
  it("rejects writes from sibling sites, text/plain bodies and missing origin", () => {
    expect(getSessionToken(req("POST", { origin: "https://ai.codingclub.tech", "content-type": "application/json" }))).toBeNull();
    expect(getSessionToken(req("POST", { origin: "https://studio.example", "content-type": "text/plain" }))).toBeNull();
    expect(getSessionToken(req("PATCH", { "content-type": "application/json" }))).toBeNull();
    expect(getSessionToken(req("DELETE", { "content-type": "application/json", "sec-fetch-site": "same-site" }))).toBeNull();
  });
  it("still accepts explicit Bearer tokens (never sent automatically by browsers)", () => {
    const r = new NextRequest("https://studio.example/api/roles", { method: "POST", headers: { authorization: "Bearer gho_x" } });
    expect(getSessionToken(r)).toBe("gho_x");
    expect(isSameOriginJsonRequest(r)).toBe(false);
  });
});
