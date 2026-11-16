import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import matter from "gray-matter";
import { makeWorld, type World } from "./harness";

// Blogs join a learning track only through their own frontmatter `placement` (design v3.1 §2.3, §2.6, §2.7).
let w: World;
const TRACK = "content/verticals/ai-ml/tracks/ml-basics.json";
const ARTICLE = "content/verticals/ai-ml/posts/intro-to-transformers.md";
const track = (topics: { id: string; subtopics?: string[] }[]) =>
  JSON.stringify({
    title: "ML Basics",
    summary: "",
    vertical: "ai-ml",
    topics: topics.map((t) => ({
      id: t.id,
      title: t.id.toUpperCase(),
      ...(t.subtopics ? { subtopics: t.subtopics.map((s) => ({ id: s, title: s })) } : {}),
    })),
  });

/** Hand-edit the article on the PR branch to add a placement (the CMS picker arrives in Phase 3a). */
function place(branch: string, placement: Record<string, string>, author = "m1") {
  const raw = w.fake.readText(branch, ARTICLE)!;
  const { data, content } = matter(raw);
  w.fake.push(branch, { [ARTICLE]: matter.stringify(content, { ...data, placement }) }, { message: "draft: place in track", author });
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  w = makeWorld();
  w.fake.push("main", { [TRACK]: track([{ id: "basics", subtopics: ["attention"] }, { id: "advanced" }]) }, { message: "feat(ai-ml): add track", author: "h1" });
});
afterEach(() => {
  expect(w.fake.unhandled).toEqual([]);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("13. blog placement in learning tracks", () => {
  it("a member's placed blog merges under the normal quorum and keeps its placement on main", async () => {
    const s = await w.submit("m1");
    expect(s.status).toBe(200);
    place(s.branch, { track: "ml-basics", topic: "basics", subtopic: "attention" });

    const ok = await w.review("h1", s.pull, "approve");
    expect(ok.status).toBe(200);
    expect(ok.json.merged).toBe(true);
    expect(matter(w.fake.readText("main", ARTICLE)!).data.placement).toEqual({ track: "ml-basics", topic: "basics", subtopic: "attention" });
  });

  it("refuses to merge when the topic was removed on main after the PR opened, records nothing, and still allows reject", async () => {
    const s = await w.submit("m1");
    place(s.branch, { track: "ml-basics", topic: "advanced" });
    // the Head removes the "advanced" topic on main while the blog is waiting for review
    w.fake.push("main", { [TRACK]: track([{ id: "basics" }]) }, { message: "fix(ai-ml): trim track", author: "h1" });

    const reviewsBefore = w.fake.reviewsOf(s.pull).length;
    const blocked = await w.review("h1", s.pull, "approve");
    expect(blocked.status).toBe(409);
    expect(blocked.json.error).toMatch(/placed under "ml-basics › advanced", which doesn't exist on main any more/);
    expect(w.fake.pull(s.pull).merged).toBe(false);
    expect(w.fake.readFile("main", ARTICLE)).toBeNull();
    expect(w.fake.reviewsOf(s.pull).length).toBe(reviewsBefore); // no approval was recorded

    const rejected = await w.review("h1", s.pull, "reject", { reason: "please move it" });
    expect(rejected.status).toBe(200);
  });

  it("refuses a missing track, a subtopic under the wrong topic and a malformed placement; fixing it lets the merge through", async () => {
    for (const bad of [
      { track: "no-such-track", topic: "basics" },
      { track: "ml-basics", topic: "advanced", subtopic: "attention" },
      { track: "ml-basics", topic: "Basics!" },
    ]) {
      const s = await w.submit("m1", { title: `Placement ${bad.topic} ${bad.track}` });
      expect(s.status).toBe(200);
      const path = `content/verticals/ai-ml/posts/${w.fake.changedFiles(s.branch).find((f) => f.filename.endsWith(".md"))!.filename.split("/").pop()}`;
      const raw = w.fake.readText(s.branch, path)!;
      const { data, content } = matter(raw);
      w.fake.push(s.branch, { [path]: matter.stringify(content, { ...data, placement: bad }) }, { message: "draft: place", author: "m1" });
      const r = await w.review("h1", s.pull, "approve");
      expect(r.status, JSON.stringify(bad)).toBe(409);
      expect(w.fake.pull(s.pull).merged).toBe(false);

      // fix the placement and approve again
      w.fake.push(s.branch, { [path]: matter.stringify(content, { ...data, placement: { track: "ml-basics", topic: "basics" } }) }, { message: "draft: fix place", author: "m1" });
      const ok = await w.review("h1", s.pull, "approve");
      expect(ok.status, JSON.stringify(bad)).toBe(200);
      expect(ok.json.merged).toBe(true);
    }
  });

  it("a CMS revision of a placed blog keeps the placement (the form can't edit it yet)", async () => {
    const s = await w.submit("m1");
    place(s.branch, { track: "ml-basics", topic: "basics" });

    const rev = await w.submit("m1", { pullNumber: s.pull, existingBranch: s.branch, body: "Revised body.", cover: false });
    expect(rev.status).toBe(200);
    const fm = matter(w.fake.readText(s.branch, ARTICLE)!);
    expect(fm.content).toContain("Revised body.");
    expect(fm.data.placement).toEqual({ track: "ml-basics", topic: "basics" });
  });

  it("unpublishing a placed blog is allowed (tracks never reference blogs directly)", async () => {
    const s = await w.submit("m1");
    place(s.branch, { track: "ml-basics", topic: "basics" });
    expect((await w.review("h1", s.pull, "approve")).json.merged).toBe(true);

    const r = await w.call("h1", "DELETE", "/api/posts/manage", { vertical: "ai-ml", slug: "intro-to-transformers" });
    expect(r.status).toBe(200);
    const ok = await w.review("sa1", r.json.pullNumber, "approve");
    expect(ok.status).toBe(200);
    expect(ok.json.merged).toBe(true);
    expect(w.fake.readFile("main", ARTICLE)).toBeNull();
  });
});
