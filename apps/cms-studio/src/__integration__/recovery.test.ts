import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import matter from "gray-matter";
import { makeWorld, type World } from "./harness";

// Mistake recovery: edit a published article, withdraw a pending request, restore an unpublished article,
// delete a track, and refuse merges that would overwrite a change made on main in the meantime.
let w: World;
const AI_POST = "content/verticals/ai-ml/posts/existing-ai-post.md";
const TRACK = "content/verticals/ai-ml/tracks/ml-basics.json";
const track = (topics: string[], title = "ML Basics") =>
  JSON.stringify({ title, summary: "", vertical: "ai-ml", topics: topics.map((id) => ({ id, title: id })) });

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

const edit = (login: string, extra: Record<string, unknown> = {}) =>
  w.submit(login, { vertical: "ai-ml", slug: "existing-ai-post", title: "Existing AI Post (fixed)", body: "Fixed typo.", cover: false, editPublished: true, ...extra });

describe("16. editing a published article", () => {
  it("opens an edit PR that keeps the byline and date; main is untouched until approved; quorum follows the original author", async () => {
    const before = w.fake.readText("main", AI_POST)!;
    const r = await edit("m1");
    expect(r.status).toBe(200);
    const pr = w.fake.pull(r.pull);
    expect(pr.title).toBe("fix(ai-ml): edit Existing AI Post (fixed)");
    expect(w.fake.changedFiles(pr.headRef)).toEqual([{ filename: AI_POST, status: "modified" }]);
    const fm = matter(w.fake.readText(pr.headRef, AI_POST)!);
    const old = matter(before);
    expect(fm.data.authorUsername).toBe(old.data.authorUsername); // h1 stays the author
    expect(fm.data.date).toBe(old.data.date);
    expect(fm.content).toContain("Fixed typo.");
    expect(w.fake.readText("main", AI_POST)).toBe(before);

    // m1 edited h1's article: Deputies and the Head can't approve it (h1 is the original author); a Superadmin can
    for (const u of ["d1", "d2", "h1"]) expect((await w.review(u, r.pull, "approve")).status, u).toBe(403);
    const ok = await w.review("sa1", r.pull, "approve");
    expect(ok.json.merged).toBe(true);
    expect(matter(w.fake.readText("main", AI_POST)!).content).toContain("Fixed typo.");
  });

  it("only works for an article that is published; outsiders and other verticals can't; the published loader returns the live file", async () => {
    expect((await w.submit("m1", { vertical: "ai-ml", slug: "nope", title: "Nope", cover: false, editPublished: true })).status).toBe(404);
    expect((await edit("h2")).status).toBe(403);
    expect((await edit("x1")).status).toBe(403);
    const loaded = await w.call("m1", "GET", "/api/posts/published?vertical=ai-ml&slug=existing-ai-post");
    expect(loaded.status).toBe(200);
    expect(loaded.json.article).toMatchObject({ title: "Existing AI Post", authorUsername: "h1", vertical: "ai-ml" });
    expect((await w.call("m1", "GET", "/api/posts/published?vertical=ai-ml&slug=../x")).status).toBe(400);
  });

  it("keeps the placement unless the edit changes it", async () => {
    w.fake.push("main", { [TRACK]: track(["basics", "advanced"]) }, { message: "feat(ai-ml): track", author: "h1" });
    const { data, content } = matter(w.fake.readText("main", AI_POST)!);
    w.fake.push("main", { [AI_POST]: matter.stringify(content, { ...data, placement: { track: "ml-basics", topic: "basics" } }) }, { message: "x", author: "h1" });
    const keep = await edit("h1");
    expect(matter(w.fake.readText(w.fake.pull(keep.pull).headRef, AI_POST)!).data.placement).toEqual({ track: "ml-basics", topic: "basics" });
    const move = await edit("h1", { placement: { track: "ml-basics", topic: "advanced" } });
    expect(matter(w.fake.readText(w.fake.pull(move.pull).headRef, AI_POST)!).data.placement).toEqual({ track: "ml-basics", topic: "advanced" });
  });
});

describe("17. merges never overwrite a change made on main in the meantime", () => {
  it("the second of two edits to the same article is refused at merge with a clear message", async () => {
    const a = await edit("m1", { body: "Edit A" });
    const b = await edit("m2", { body: "Edit B" });
    expect((await w.review("sa1", a.pull, "approve")).json.merged).toBe(true);
    const second = await w.review("sa1", b.pull, "approve");
    expect(second.status).toBe(409);
    expect(second.json.error).toMatch(/changed on the live site after this request was opened/);
    expect(matter(w.fake.readText("main", AI_POST)!).content).toContain("Edit A");
  });

  it("the same guard covers track edits", async () => {
    w.fake.push("main", { [TRACK]: track(["basics"]) }, { message: "feat(ai-ml): track", author: "h1" });
    const body = (topics: string[], title: string) => ({ vertical: "ai-ml", slug: "ml-basics", mode: "edit", track: JSON.parse(track(topics, title)) });
    const a = await w.call("h1", "POST", "/api/tracks", body(["basics", "a"], "A"));
    const b = await w.call("h1", "POST", "/api/tracks", body(["basics", "b"], "B"));
    expect((await w.review("sa1", a.json.pullNumber, "approve")).json.merged).toBe(true);
    expect((await w.review("sa1", b.json.pullNumber, "approve")).status).toBe(409);
  });

  it("a revision must be based on the PR's current head (someone else pushed → 409, nothing written)", async () => {
    const s = await w.submit("m1");
    const loaded = w.fake.headSha(s.pull);
    w.fake.push(s.branch, { [w.fake.changedFiles(s.branch).find((f) => f.filename.endsWith(".md"))!.filename]: "---\ntitle: x\n---\nother" }, { author: "m1", message: "x" });
    const stale = await w.submit("m1", { pullNumber: s.pull, existingBranch: s.branch, cover: false, expectedHeadSha: loaded });
    expect(stale.status).toBe(409);
    expect(stale.json.error).toMatch(/changed since you opened it/);
  });
});

describe("18. withdrawing a pending request", () => {
  it("the author withdraws: PR closed, branch deleted, main untouched; others can't; superadmins can", async () => {
    const before = w.mainTip();
    const s = await w.submit("m1");
    expect((await w.call("m2", "POST", "/api/posts/withdraw", { pullNumber: s.pull })).status).toBe(403);
    expect((await w.call("h1", "POST", "/api/posts/withdraw", { pullNumber: s.pull })).status).toBe(403);
    const ok = await w.call("m1", "POST", "/api/posts/withdraw", { pullNumber: s.pull });
    expect(ok.status).toBe(200);
    expect(w.fake.pull(s.pull).state).toBe("closed");
    expect(w.fake.pull(s.pull).merged).toBe(false);
    expect(w.fake.hasBranch(s.branch)).toBe(false);
    expect(w.mainTip()).toBe(before);
    expect((await w.call("m1", "POST", "/api/posts/withdraw", { pullNumber: s.pull })).status).toBe(400);

    const t = await w.submit("m2", { title: "Another one" });
    expect((await w.call("sa1", "POST", "/api/posts/withdraw", { pullNumber: t.pull })).status).toBe(200);
  });

  it("refuses PRs not made by the Studio", async () => {
    w.fake.createBranch("feature/x");
    w.fake.push("feature/x", { "README.md": "x" }, { author: "m1", message: "x" });
    const pr = w.fake.openPull({ author: "m1", head: "feature/x", title: "x" });
    expect((await w.call("m1", "POST", "/api/posts/withdraw", { pullNumber: pr.number })).status).toBe(400);
    expect(w.fake.pull(pr.number).state).toBe("open");
  });
});

describe("19. restoring an unpublished article", () => {
  async function unpublish() {
    const r = await w.call("h1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "existing-ai-post" });
    expect((await w.review("sa1", r.json.pullNumber, "approve")).json.merged).toBe(true);
    expect(w.fake.readFile("main", AI_POST)).toBeNull();
  }

  it("lists it for its Head/Superadmins, restores it exactly through a reviewed PR, then drops off the list", async () => {
    const original = w.fake.readText("main", AI_POST)!;
    await unpublish();
    const list = await w.call("h1", "GET", "/api/posts/restore");
    expect(list.json.posts).toEqual([expect.objectContaining({ vertical: "ai-ml", slug: "existing-ai-post", title: "Existing AI Post" })]);
    expect((await w.call("h2", "GET", "/api/posts/restore")).json.posts).toEqual([]);

    expect((await w.call("m1", "POST", "/api/posts/restore", { vertical: "ai-ml", slug: "existing-ai-post" })).status).toBe(403);
    expect((await w.call("h2", "POST", "/api/posts/restore", { vertical: "ai-ml", slug: "existing-ai-post" })).status).toBe(403);
    const r = await w.call("h1", "POST", "/api/posts/restore", { vertical: "ai-ml", slug: "existing-ai-post" });
    expect(r.status).toBe(200);
    const pr = w.fake.pull(r.json.pullNumber);
    expect(pr.headRef).toMatch(/^draft\/ai-ml\/restore-existing-ai-post-\d{5}$/);
    expect(w.fake.readText(pr.headRef, AI_POST)).toBe(original);
    expect(w.fake.readFile("main", AI_POST)).toBeNull();

    // the original author (h1) restored it, so a Superadmin approves
    expect((await w.review("d1", r.json.pullNumber, "approve")).status).toBe(403);
    expect((await w.review("sa2", r.json.pullNumber, "approve")).json.merged).toBe(true);
    expect(w.fake.readText("main", AI_POST)).toBe(original);
    expect((await w.call("h1", "GET", "/api/posts/restore")).json.posts).toEqual([]);
  });

  it("refuses something that isn't in the unpublished list", async () => {
    expect((await w.call("h1", "POST", "/api/posts/restore", { vertical: "ai-ml", slug: "existing-ai-post" })).status).toBe(404);
    expect((await w.call("h1", "POST", "/api/posts/restore", { vertical: "ai-ml", slug: "../x" })).status).toBe(400);
  });
});

describe("20. deleting a track", () => {
  it("the Head requests deletion; the PR removes only the track; a Superadmin merges; placed blogs stay published", async () => {
    w.fake.push("main", { [TRACK]: track(["basics"]) }, { message: "feat(ai-ml): track", author: "h1" });
    const { data, content } = matter(w.fake.readText("main", AI_POST)!);
    w.fake.push("main", { [AI_POST]: matter.stringify(content, { ...data, placement: { track: "ml-basics", topic: "basics" } }) }, { message: "x", author: "h1" });

    for (const u of ["m1", "d1", "h2"]) {
      expect((await w.call(u, "POST", "/api/tracks", { vertical: "ai-ml", slug: "ml-basics", mode: "delete" })).status, u).toBe(403);
    }
    expect((await w.call("h1", "POST", "/api/tracks", { vertical: "ai-ml", slug: "nope", mode: "delete" })).status).toBe(404);
    const r = await w.call("h1", "POST", "/api/tracks", { vertical: "ai-ml", slug: "ml-basics", mode: "delete" });
    expect(r.status).toBe(200);
    const pr = w.fake.pull(r.json.pullNumber);
    expect(pr.headRef).toMatch(/^track\/ai-ml\/remove-ml-basics-\d{5}$/);
    expect(w.fake.changedFiles(pr.headRef)).toEqual([{ filename: TRACK, status: "removed" }]);
    expect(pr.body).toMatch(/1 published blog is placed in it/);

    const preview = await w.call("sa1", "GET", `/api/posts/reviews?previewPullNumber=${r.json.pullNumber}`);
    expect(preview.json.article).toMatchObject({ kind: "track", deleting: true, title: "ML Basics" });

    // a deletion request can't be turned into an edit, and can be withdrawn
    const revise = await w.call("h1", "POST", "/api/tracks", {
      vertical: "ai-ml",
      slug: "ml-basics",
      mode: "edit",
      track: JSON.parse(track(["basics"])),
      pullNumber: r.json.pullNumber,
      expectedHeadSha: w.fake.headSha(r.json.pullNumber),
    });
    expect(revise.status).toBe(400);
    expect(revise.json.error).toMatch(/request to delete this track/);

    expect((await w.review("d1", r.json.pullNumber, "approve")).status).toBe(403);
    const ok = await w.review("sa1", r.json.pullNumber, "approve");
    expect(ok.json.merged).toBe(true);
    expect(w.fake.readFile("main", TRACK)).toBeNull();
    expect(w.fake.readText("main", AI_POST)).toBeTruthy();
    expect(w.fake.history("main")[0].message.split("\n")[0]).toBe(`chore(ai-ml): remove track ml-basics (#${r.json.pullNumber})`);
  });
});
