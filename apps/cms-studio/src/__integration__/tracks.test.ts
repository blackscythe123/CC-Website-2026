import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import matter from "gray-matter";
import { articleMd, makeWorld, type World } from "./harness";

// Phase 3b: learning tracks are proposed by the Vertical Head (or a Superadmin) as one-file PRs on
// track/<v>/<slug>-<id> branches and must be approved by a Superadmin (another one for a Superadmin's track).
let w: World;
const PATH = "content/verticals/ai-ml/tracks/ml-roadmap.json";

const track = (topics: { id: string; title?: string; subtopics?: string[]; items?: unknown[] }[], title = "ML Roadmap") => ({
  title,
  summary: "From zero to transformers.",
  vertical: "ai-ml",
  topics: topics.map((t) => ({
    id: t.id,
    title: t.title || t.id,
    ...(t.items ? { items: t.items } : {}),
    ...(t.subtopics ? { subtopics: t.subtopics.map((s) => ({ id: s, title: s })) } : {}),
  })),
});
const link = (id: string) => ({ id, type: "link", title: `Link ${id}`, url: `https://example.com/${id}`, description: "Read this." });

const propose = (login: string, body: Record<string, unknown>) =>
  w.call(login, "POST", "/api/tracks", { vertical: "ai-ml", slug: "ml-roadmap", mode: "create", track: track([{ id: "basics", items: [link("l1")] }]), ...body });

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

describe("15. learning-track proposals", () => {
  it("the Head proposes a track; Deputies, members and other verticals can't approve it; the Head publishes it with a server-built subject", async () => {
    const before = w.mainTip();
    const r = await propose("h1", {});
    expect(r.status).toBe(200);
    const pull = r.json.pullNumber as number;
    const pr = w.fake.pull(pull);
    expect(pr.headRef).toMatch(/^track\/ai-ml\/ml-roadmap-\d{5}$/);
    expect(pr.title).toBe("feat(ai-ml): track ML Roadmap");
    expect(w.fake.changedFiles(pr.headRef)).toEqual([{ filename: PATH, status: "added" }]);
    expect(w.mainTip()).toBe(before);
    expect(JSON.parse(w.fake.readText(pr.headRef, PATH)!).topics[0].items[0].description).toBe("Read this.");

    // the queue shows it as a track; the preview returns the parsed track
    const entry = await w.listEntry("sa1", pull);
    expect(entry.kind).toBe("track");
    const preview = await w.call("sa1", "GET", `/api/posts/reviews?previewPullNumber=${pull}`);
    expect(preview.json.article).toMatchObject({ kind: "track", slug: "ml-roadmap", title: "ML Roadmap", vertical: "ai-ml" });

    for (const u of ["d1", "d2", "m1", "h2", "x1"]) {
      const a = await w.review(u, pull, "approve", { sha: w.fake.headSha(pull) });
      expect([400, 403], u).toContain(a.status);
    }
    expect(w.fake.pull(pull).merged).toBe(false);

    const ok = await w.review("h1", pull, "approve");
    expect(ok.status).toBe(200);
    expect(ok.json.merged).toBe(true);
    expect(JSON.parse(w.fake.readText("main", PATH)!).title).toBe("ML Roadmap");
    expect(w.fake.history("main")[0].message.split("\n")[0]).toBe(`feat(ai-ml): track ML Roadmap (#${pull})`);
    expect(w.fake.hasBranch(pr.headRef)).toBe(false);
  });

  it("only the Head or a Superadmin may propose; members, deputies, other verticals' heads and outsiders are refused before any write", async () => {
    const before = w.fake.mutations().length;
    for (const u of ["m1", "d1", "d3", "h2", "x1"]) {
      expect((await propose(u, {})).status, u).toBe(403);
    }
    expect((await w.call(null, "POST", "/api/tracks", {})).status).toBe(401);
    expect(w.fake.mutations().length).toBe(before);
  });

  it("a Superadmin publishes their own track; a Deputy can't", async () => {
    const r = await propose("sa1", {});
    expect(r.status).toBe(200);
    expect((await w.review("d1", r.json.pullNumber, "approve")).status).toBe(403);
    const ok = await w.review("sa1", r.json.pullNumber, "approve", { sha: w.fake.headSha(r.json.pullNumber) });
    expect(ok.status).toBe(200);
    expect(ok.json.merged).toBe(true);
  });

  it("rejects invalid tracks and names with readable errors, before any write", async () => {
    const before = w.fake.mutations().length;
    const bad = [
      { track: track([{ id: "basics", items: [{ id: "x", type: "link", title: "x", url: "javascript:alert(1)" }] }]) },
      { track: track([{ id: "2024" }]) },
      { track: { ...track([{ id: "basics" }]), vertical: "full-stack" } },
      { track: track([]) },
      { slug: "Bad Name" },
      { slug: "../../roles" },
      { mode: "replace" },
      { vertical: "club" },
    ];
    for (const b of bad) {
      const r = await propose("h1", b);
      expect(r.status, JSON.stringify(b)).toBe(400);
      expect(typeof r.json.error).toBe("string");
    }
    expect(w.fake.mutations().length).toBe(before);
  });

  it("create refuses an existing track (409); edit refuses a missing one (404); edits can remove ids but never move them", async () => {
    w.fake.push("main", { [PATH]: JSON.stringify(track([{ id: "basics", subtopics: ["attention"] }, { id: "advanced" }])) }, { message: "feat(ai-ml): seed", author: "h1" });
    expect((await propose("h1", {})).status).toBe(409);
    expect((await propose("h1", { mode: "edit", slug: "nope" })).status).toBe(404);

    const moved = await propose("h1", { mode: "edit", track: track([{ id: "basics" }, { id: "advanced", subtopics: ["attention"] }]) });
    expect(moved.status).toBe(400);
    expect(moved.json.error).toMatch(/"attention" was a subtopic of "basics"/);
    const promoted = await propose("h1", { mode: "edit", track: track([{ id: "basics" }, { id: "attention" }]) });
    expect(promoted.status).toBe(400);

    const removed = await propose("h1", { mode: "edit", track: track([{ id: "basics" }], "ML Roadmap v2") });
    expect(removed.status).toBe(200);
    expect(w.fake.changedFiles(w.fake.pull(removed.json.pullNumber).headRef)).toEqual([{ filename: PATH, status: "modified" }]);
  });

  it("revisions: own PR only, pinned to the head the author saw, and only into the same track file", async () => {
    const r = await propose("h1", {});
    const pull = r.json.pullNumber as number;
    const head = w.fake.headSha(pull);

    const stale = await propose("h1", { pullNumber: pull, expectedHeadSha: "0".repeat(40) });
    expect(stale.status).toBe(409);
    const otherSlug = await propose("h1", { pullNumber: pull, expectedHeadSha: head, slug: "other-track" });
    expect(otherSlug.status).toBe(400);

    const ok = await propose("h1", { pullNumber: pull, expectedHeadSha: head, track: track([{ id: "basics", items: [link("l1"), link("l2")] }]) });
    expect(ok.status).toBe(200);
    expect(JSON.parse(w.fake.readText(w.fake.pull(pull).headRef, PATH)!).topics[0].items).toHaveLength(2);

    // a superadmin may revise a head's proposal and still publish it (full control)
    const sa = await propose("sa1", { pullNumber: pull, expectedHeadSha: w.fake.headSha(pull) });
    expect(sa.status).toBe(200);
    expect((await w.review("sa1", pull, "approve")).json.merged).toBe(true);
  });

  it("a bad track pushed to the branch after submit is caught when approving; extra files make the PR unreviewable", async () => {
    const r = await propose("h1", {});
    const pull = r.json.pullNumber as number;
    const branch = w.fake.pull(pull).headRef;

    w.fake.push(branch, { [PATH]: JSON.stringify({ ...track([{ id: "basics" }]), topics: [{ id: "basics", title: "b", items: [{ id: "x", type: "link", title: "x", url: "http://evil.example" }] }] }) }, { author: "h1", message: "x" });
    const bad = await w.review("sa1", pull, "approve");
    expect(bad.status).toBe(409);
    expect(w.fake.pull(pull).merged).toBe(false);
    // the reviewer can still see the problems and send it back
    const preview = await w.call("sa1", "GET", `/api/posts/reviews?previewPullNumber=${pull}`);
    expect(preview.json.article).toMatchObject({ kind: "track", track: null });
    expect(preview.json.article.trackErrors.join(" ")).toMatch(/https link/);
    const sentBack = await w.review("sa1", pull, "reject", { reason: "Use https links." });
    expect(sentBack.status).toBe(200);

    w.fake.push(branch, { [PATH]: JSON.stringify(track([{ id: "basics" }])), ".github/workflows/x.yml": "on: push" }, { author: "h1", message: "y" });
    const extra = await w.review("sa1", pull, "approve");
    expect(extra.status).toBe(400);
    expect(extra.json.error).toMatch(/only that one track file/);
    expect(w.fake.pull(pull).merged).toBe(false);
  });

  it("branch namespace and content kind must agree, and the article editor can't revise a track PR", async () => {
    // a draft/ branch carrying a track file
    w.fake.createBranch("draft/ai-ml/sneaky-12345");
    w.fake.push("draft/ai-ml/sneaky-12345", { [PATH]: JSON.stringify(track([{ id: "basics" }])) }, { author: "h1", message: "z" });
    const sneaky = w.fake.openPull({ author: "h1", head: "draft/ai-ml/sneaky-12345", title: "feat(ai-ml): sneaky" });
    expect((await w.review("sa1", sneaky.number, "approve", { sha: w.fake.headSha(sneaky.number) })).status).toBe(400);

    // a track/ branch carrying an article
    w.fake.createBranch("track/ai-ml/sneaky-54321");
    w.fake.push("track/ai-ml/sneaky-54321", { "content/verticals/ai-ml/posts/sneaky.md": articleMd({ title: "Sneaky", vertical: "ai-ml", author: "h1" }) }, { author: "h1", message: "z" });
    const sneaky2 = w.fake.openPull({ author: "h1", head: "track/ai-ml/sneaky-54321", title: "feat(ai-ml): sneaky" });
    expect((await w.review("sa1", sneaky2.number, "approve", { sha: w.fake.headSha(sneaky2.number) })).status).toBe(400);

    // the article editor refuses to push a blog into a track PR
    const r = await propose("h1", {});
    const rev = await w.submit("h1", { pullNumber: r.json.pullNumber, existingBranch: w.fake.pull(r.json.pullNumber).headRef, cover: false });
    expect(rev.status).toBe(400);
    expect(w.fake.changedFiles(w.fake.pull(r.json.pullNumber).headRef)).toEqual([{ filename: PATH, status: "added" }]);
  });

  it("a track PR opened by a Deputy outside the CMS can't be merged, even by a Superadmin", async () => {
    w.fake.createBranch("track/ai-ml/ml-roadmap-11111");
    w.fake.push("track/ai-ml/ml-roadmap-11111", { [PATH]: JSON.stringify(track([{ id: "basics" }])) }, { author: "d1", message: "feat(ai-ml): track" });
    const pr = w.fake.openPull({ author: "d1", head: "track/ai-ml/ml-roadmap-11111", title: "feat(ai-ml): track ML Roadmap" });
    const r = await w.review("sa1", pr.number, "approve", { sha: w.fake.headSha(pr.number) });
    expect(r.status).toBe(403);
    expect(r.json.error).toMatch(/only be proposed by the Vertical Head or a Superadmin/);
    expect(w.fake.pull(pr.number).merged).toBe(false);
  });

  it("GET ?slug returns the published track and how many blogs are placed in each section", async () => {
    w.fake.push("main", { [PATH]: JSON.stringify(track([{ id: "basics", subtopics: ["attention"] }, { id: "advanced" }])) }, { message: "feat(ai-ml): seed", author: "h1" });
    const raw = w.fake.readText("main", "content/verticals/ai-ml/posts/existing-ai-post.md")!;
    const { data, content } = matter(raw);
    w.fake.push(
      "main",
      {
        "content/verticals/ai-ml/posts/existing-ai-post.md": matter.stringify(content, { ...data, placement: { track: "ml-roadmap", topic: "basics", subtopic: "attention" } }),
        "content/verticals/ai-ml/posts/second.md": matter.stringify("x", { title: "Second", placement: { track: "ml-roadmap", topic: "advanced" } }),
        "content/verticals/ai-ml/posts/other.md": matter.stringify("x", { title: "Other", placement: { track: "another", topic: "advanced" } }),
      },
      { message: "feat(ai-ml): place", author: "h1" }
    );
    const r = await w.call("m1", "GET", "/api/tracks?vertical=ai-ml&slug=ml-roadmap");
    expect(r.status).toBe(200);
    expect(r.json.track.title).toBe("ML Roadmap");
    expect(r.json.placedCounts).toEqual({ "basics/attention": 1, advanced: 1 });
    expect((await w.call("m1", "GET", "/api/tracks?vertical=ai-ml&slug=missing")).status).toBe(404);
  });
});
