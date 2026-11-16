import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeWorld, type World } from "./harness";

let w: World;
const POST = "content/verticals/ai-ml/posts/existing-ai-post.md";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  w = makeWorld();
});
afterEach(() => {
  expect(w.fake.unhandled).toEqual([]);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("12. unpublish", () => {
  it("h1 requests unpublish -> main untouched, PR contains only the removed .md; d1 cannot request; sa1 approval removes it", async () => {
    const before = w.mainTip();
    const d = await w.call("d1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "existing-ai-post" });
    expect(d.status).toBe(403);
    expect(w.fake.pulls).toHaveLength(0);
    expect(w.fake.mutations()).toHaveLength(0);

    const r = await w.call("h1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "existing-ai-post" });
    expect(r.status).toBe(200);
    const pull = r.json.pullNumber as number;
    expect(w.mainTip()).toBe(before);
    expect(w.fake.readText("main", POST)).toContain("Existing AI Post");
    const pr = w.fake.pull(pull);
    expect(pr).toMatchObject({ state: "open", user: "h1", baseRef: "main" });
    expect(w.fake.changedFiles(pr.headRef)).toEqual([{ filename: POST, status: "removed" }]);
    expect(pr.headRef).toMatch(/^draft\/ai-ml\/unpublish-existing-ai-post-\d{5}$/);

    // the requester and everyone below a superadmin cannot approve a head's unpublish
    for (const u of ["h1", "d1", "d2", "h2", "m1", "x1"]) {
      const a = await w.review(u, pull, "approve", { sha: w.fake.headSha(pull) });
      expect([403, 400], u).toContain(a.status);
    }
    expect(w.fake.pull(pull).merged).toBe(false);
    expect(w.fake.readText("main", POST)).toBeTruthy();

    const ok = await w.review("sa1", pull, "approve");
    expect(ok.status).toBe(200);
    expect(ok.json.merged).toBe(true);
    expect(w.fake.readFile("main", POST)).toBeNull();
    expect(w.fake.history("main")[0].message.split("\n")[0]).toBe(`chore(ai-ml): unpublish existing-ai-post (#${pull})`);
    expect(w.fake.hasBranch(pr.headRef)).toBe(false);
    // everything else is still there
    expect(w.fake.readText("main", "content/verticals/full-stack/posts/existing-web-post.md")).toBeTruthy();
  });

  it("a head cannot unpublish another vertical's article; superadmin can; members/outsiders cannot", async () => {
    expect((await w.call("h1", "DELETE", "/api/posts/manage", { vertical: "full-stack", slug: "existing-web-post" })).status).toBe(403);
    for (const u of ["m1", "d3", "x1"]) {
      expect((await w.call(u, "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "existing-ai-post" })).status, u).toBe(403);
    }
    expect(w.fake.pulls).toHaveLength(0);
    const r = await w.call("sa1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "existing-ai-post" });
    expect(r.status).toBe(200);
    // a superadmin's unpublish needs ANOTHER superadmin
    const self = await w.review("sa1", r.json.pullNumber, "approve", { sha: w.fake.headSha(r.json.pullNumber) });
    expect(self.status).toBe(403);
    expect((await w.review("h1", r.json.pullNumber, "approve")).status).toBe(403);
    expect((await w.review("sa2", r.json.pullNumber, "approve")).json.merged).toBe(true);
    expect(w.fake.readFile("main", POST)).toBeNull();
  });

  it("unpublishing a missing article or with traversal characters writes nothing", async () => {
    const missing = await w.call("h1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "no-such-post" });
    expect(missing.status).toBe(400);
    const bad = await w.call("sa1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "../../roles" });
    expect(bad.status).toBe(400);
    expect(w.fake.mutations()).toHaveLength(0);
    expect(w.fake.branches("draft/")).toEqual([]);
  });

  it("a member-authored PR that deletes an article is not accepted as an unpublish (only head/superadmin requests count)", async () => {
    const branch = "draft/ai-ml/unpublish-existing-ai-post-99999";
    w.fake.createBranch(branch);
    w.fake.push(branch, { [POST]: null }, { author: "m1" });
    const pr = w.fake.openPull({ author: "m1", head: branch, title: "chore(ai-ml): unpublish" });
    const r = await w.review("sa1", pr.number, "approve", { sha: w.fake.headSha(pr.number) });
    expect(r.status).toBe(403);
    expect(w.fake.readText("main", POST)).toBeTruthy();
    expect(w.fake.pull(pr.number).merged).toBe(false);
  });
});

describe("published-post listing", () => {
  it("GET /api/posts/manage lists main's posts and canDelete reflects live roles", async () => {
    const r = await w.call("h1", "GET", "/api/posts/manage");
    expect(r.status).toBe(200);
    const posts = r.json.posts as { slug: string; vertical: string; canDelete: boolean }[];
    expect(posts.map((p) => `${p.vertical}/${p.slug}`).sort()).toEqual(["ai-ml/existing-ai-post", "club/welcome", "full-stack/existing-web-post"]);
    expect(Object.fromEntries(posts.map((p) => [p.slug, p.canDelete]))).toEqual({
      "existing-ai-post": true,
      "existing-web-post": false,
      welcome: false,
    });
  });
});
