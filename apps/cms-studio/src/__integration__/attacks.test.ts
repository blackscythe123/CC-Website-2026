import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeWorld, PNG_B64, UPLOADS, ROLES_PATH, articleMd, type World } from "./harness";

let w: World;
const AI = (slug: string) => `content/verticals/ai-ml/posts/${slug}.md`;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  w = makeWorld();
});
afterEach(() => {
  expect(w.fake.unhandled, "every GitHub request must be handled by the fake").toEqual([]);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A PR m1 "pushed outside the CMS": a valid draft branch name plus the given extra changes. */
function outsidePr(changes: Record<string, string | Buffer | null>, o: { author?: string; slug?: string; withArticle?: boolean } = {}) {
  const slug = o.slug || "sneaky";
  const branch = `draft/ai-ml/${slug}-11111`;
  w.fake.createBranch(branch);
  const files: Record<string, string | Buffer | null> = { ...changes };
  if (o.withArticle !== false) files[AI(slug)] = articleMd({ title: "Sneaky", vertical: "ai-ml", author: o.author || "m1" });
  w.fake.push(branch, files, { author: o.author || "m1" });
  return w.fake.openPull({ author: o.author || "m1", head: branch, title: "feat(ai-ml): Sneaky" });
}

describe("9. PRs created outside the CMS that smuggle extra changes are never merged", () => {
  const evilRoles = () => {
    const r = w.fake.readJson("main", ROLES_PATH);
    r.superadmins.push("m1");
    return JSON.stringify(r, null, 2);
  };
  const cases: [string, () => Record<string, string | Buffer | null>][] = [
    ["article + roles.json change", () => ({ [ROLES_PATH]: evilRoles() })],
    ["article + CODEOWNERS change", () => ({ ".github/CODEOWNERS": "* @m1\n" })],
    ["article + workflow file", () => ({ ".github/workflows/x.yml": "on: push" })],
    ["article + app source change", () => ({ "apps/cms-studio/src/lib/roles.ts": "export {}" })],
    ["article + svg upload", () => ({ [`${UPLOADS}/evil.svg`]: "<svg onload=alert(1)/>" })],
    ["article + html upload", () => ({ [`${UPLOADS}/evil.html`]: "<script>1</script>" })],
    ["article + modified existing upload", () => ({ [`${UPLOADS}/existing.png`]: Buffer.from("tampered") })],
    ["article + deleted existing upload", () => ({ [`${UPLOADS}/existing.png`]: null })],
    ["second article in another vertical", () => ({ "content/verticals/full-stack/posts/extra.md": articleMd({ title: "Extra", vertical: "full-stack", author: "m1" }) })],
  ];
  for (const [name, mk] of cases) {
    it(`${name}: approve by superadmin and head is refused, nothing merged`, async () => {
      const pr = outsidePr(mk());
      const mainBefore = w.mainTip();
      for (const reviewer of ["sa1", "h1"]) {
        const r = await w.review(reviewer, pr.number, "approve", { sha: w.fake.headSha(pr.number) });
        expect(r.status, `${reviewer}: ${JSON.stringify(r.json)}`).toBe(400);
        expect(r.json.error, name).toMatch(/Cannot review this PR: .*(outside article content|exactly one article|existing uploads)/);
      }
      expect(w.fake.pull(pr.number)).toMatchObject({ state: "open", merged: false });
      expect(w.mainTip()).toBe(mainBefore);
      expect(w.fake.reviewsOf(pr.number)).toEqual([]);
      // and the roles file on main is untouched
      expect(w.rolesOnMain().superadmins).toEqual(["sa1", "sa2"]);
    });
  }

  it("request-changes on a smuggling PR is refused too (no review/comment is recorded)", async () => {
    const pr = outsidePr({ [ROLES_PATH]: evilRoles() });
    const r = await w.review("sa1", pr.number, "reject", { sha: w.fake.headSha(pr.number), reason: "x" });
    expect(r.status).toBe(400);
    expect(w.fake.reviewsOf(pr.number)).toEqual([]);
  });

  it("renaming a published article is refused", async () => {
    const orig = w.fake.readText("main", AI("existing-ai-post"))!;
    const pr = outsidePr({ [AI("existing-ai-post")]: null, [AI("renamed-post")]: orig }, { withArticle: false, slug: "rename" });
    expect(w.fake.changedFiles(pr.headRef).map((f) => f.status)).toEqual(["renamed"]);
    const r = await w.review("sa1", pr.number, "approve", { sha: w.fake.headSha(pr.number) });
    expect(r.status).toBe(400);
    expect(w.fake.pull(pr.number).merged).toBe(false);
    expect(w.fake.readText("main", AI("existing-ai-post"))).toBe(orig);
  });

  it("a PR whose article is in a different vertical than the one being reviewed claims is judged by the file path", async () => {
    // m1 is only an ai-ml member, but puts the article under full-stack; the reviewer authority comes from the file path
    const branch = "draft/ai-ml/wrongplace-22222";
    w.fake.createBranch(branch);
    w.fake.push(branch, { "content/verticals/full-stack/posts/wrongplace.md": articleMd({ title: "Wrong", vertical: "full-stack", author: "m1" }) }, { author: "m1" });
    const pr = w.fake.openPull({ author: "m1", head: branch, title: "feat(ai-ml): Wrong" });
    // h1 (ai-ml head) must NOT be able to merge a full-stack file, even though branch/title say ai-ml
    const r = await w.review("h1", pr.number, "approve", { sha: w.fake.headSha(pr.number) });
    expect(r.status).toBe(403);
    expect(w.fake.pull(pr.number).merged).toBe(false);
  });

  it("an edit of a published head's article authored by a member needs the head or a superadmin, not deputies", async () => {
    // m1 pushes (outside the CMS) a modification of h1's published article
    const branch = "draft/ai-ml/existing-ai-post-33333";
    w.fake.createBranch(branch);
    w.fake.push(branch, { [AI("existing-ai-post")]: articleMd({ title: "Existing AI Post", vertical: "ai-ml", author: "h1", body: "hijacked" }) }, { author: "m1" });
    const pr = w.fake.openPull({ author: "m1", head: branch, title: "feat(ai-ml): edit" });
    const sha = w.fake.headSha(pr.number);
    expect((await w.review("d1", pr.number, "approve", { sha })).status).toBe(403);
    expect((await w.review("d2", pr.number, "approve", { sha })).status).toBe(403);
    expect((await w.review("h2", pr.number, "approve", { sha })).status).toBe(403);
    expect(w.fake.pull(pr.number).merged).toBe(false);
    expect((await w.review("h1", pr.number, "approve", { sha })).json.merged).toBe(true);
  });

  it("a new submission cannot overwrite an already published article", async () => {
    const before = w.mainTip();
    const r = await w.submit("m1", { title: "Existing AI Post", slug: "existing-ai-post", cover: false });
    expect(r.status).toBe(409);
    expect(r.json.error).toContain("already published");
    expect(w.fake.branches("draft/")).toEqual([]);
    expect(w.fake.pulls).toHaveLength(0);
    expect(w.mainTip()).toBe(before);
  });
});

describe("10. revising someone else's / non-CMS PRs", () => {
  it("m2 cannot revise m1's PR; nothing is written", async () => {
    const { pull, branch } = await w.submit("m1");
    const head = w.fake.headSha(pull);
    const before = w.fake.mutations().length;
    const r = await w.submit("m2", { pullNumber: pull, existingBranch: branch, body: "m2 was here", cover: false });
    expect(r.status).toBe(403);
    expect(w.fake.headSha(pull)).toBe(head);
    expect(w.fake.mutations().length).toBe(before);
  });

  it("d1 (deputy, not author, not superadmin) cannot revise a member's PR either", async () => {
    const { pull, branch } = await w.submit("m1");
    const r = await w.submit("d1", { pullNumber: pull, existingBranch: branch, body: "d1", cover: false });
    expect(r.status).toBe(403);
  });

  it("existingBranch without pullNumber -> 400 and nothing is written", async () => {
    const { branch } = await w.submit("m1");
    const before = w.fake.mutations().length;
    const r = await w.submit("m1", { existingBranch: branch, body: "x", cover: false });
    expect(r.status).toBe(400);
    expect(w.fake.mutations().length).toBe(before);
  });

  it("existingBranch that does not match the PR's real branch -> 400", async () => {
    const a = await w.submit("m1");
    const b = await w.submit("m1", { title: "Second Article", slug: "second-article", cover: false });
    const r = await w.submit("m1", { pullNumber: a.pull, existingBranch: b.branch, body: "x", cover: false });
    expect(r.status).toBe(400);
    expect(w.fake.readText(b.branch, AI("second-article"))).not.toContain("x\n");
  });

  it("a branch name with traversal characters -> 400", async () => {
    const { pull } = await w.submit("m1");
    const r = await w.submit("m1", { pullNumber: pull, existingBranch: "draft/ai-ml/../../main", body: "x", cover: false });
    expect(r.status).toBe(400);
  });

  it("a PR whose head is `main` (same repo) cannot be revised", async () => {
    const pr = w.fake.openPull({ author: "m1", head: "main", title: "feat(ai-ml): fake" });
    const before = w.mainTip();
    const r = await w.submit("m1", { pullNumber: pr.number, cover: false });
    expect(r.status).toBe(400);
    expect(w.mainTip()).toBe(before);
  });

  it("a PR from a fork (head.repo differs) cannot be revised or reviewed, even with a CMS-looking branch name", async () => {
    // fork commit: the article + a roles.json change
    const forkBranch = "draft/ai-ml/forked-44444";
    w.fake.createBranch("tmp-fork-source");
    const sha = w.fake.push("tmp-fork-source", { [AI("forked")]: articleMd({ title: "Forked", vertical: "ai-ml", author: "m1" }) }, { author: "m1" });
    const pr = w.fake.openPull({ author: "m1", head: forkBranch, headRepo: "m1/CC-Website-2026", forkSha: sha, title: "feat(ai-ml): Forked" });
    const rev = await w.submit("m1", { title: "Forked", slug: "forked", pullNumber: pr.number, cover: false });
    expect(rev.status).toBe(400);
    expect(w.fake.hasBranch(forkBranch)).toBe(false);
    for (const reviewer of ["sa1", "h1"]) {
      const r = await w.review(reviewer, pr.number, "approve", { sha });
      expect(r.status).toBe(400);
      expect(r.json.error).toMatch(/fork/i);
    }
    expect(w.fake.pull(pr.number).merged).toBe(false);
  });

  it("a revision of a PR in a different vertical than the posted one is refused", async () => {
    const { pull, branch } = await w.submit("m1");
    const r = await w.submit("m1", { vertical: "full-stack", slug: "intro-to-transformers", pullNumber: pull, existingBranch: branch, cover: false });
    expect(r.status).toBe(400); // "not a CMS draft for 'full-stack'" - refused before any write
    expect(w.fake.changedFiles(branch).map((f) => f.filename).filter((f) => f.endsWith(".md"))).toEqual([AI("intro-to-transformers")]);
  });

  it("a revision whose slug changed is refused and no second .md appears", async () => {
    const { pull, branch } = await w.submit("m1");
    const head = w.fake.headSha(pull);
    const r = await w.submit("m1", { slug: "a-different-slug", title: "Intro to Transformers", pullNumber: pull, existingBranch: branch, cover: false });
    expect(r.status).toBe(500);
    expect(r.json.error).toMatch(/new file|Keep the original/);
    expect(w.fake.headSha(pull)).toBe(head);
    expect(w.fake.changedFiles(branch).filter((f) => f.filename.endsWith(".md"))).toHaveLength(1);
  });

  it("a revision whose title changed (slug derived from title) is refused and no second .md appears", async () => {
    const first = await w.submit("m1", { title: "Original Title", cover: false });
    const head = w.fake.headSha(first.pull);
    const r = await w.submit("m1", { title: "Retitled Article", pullNumber: first.pull, existingBranch: first.branch, cover: false });
    expect(r.status).toBe(500);
    expect(w.fake.headSha(first.pull)).toBe(head);
    expect(w.fake.changedFiles(first.branch).filter((f) => f.filename.endsWith(".md")).map((f) => f.filename)).toEqual([AI("original-title")]);
  });

  it("revising a closed/merged PR is refused", async () => {
    const { pull, branch } = await w.submit("m1");
    await w.review("h1", pull, "approve");
    expect(w.fake.pull(pull).merged).toBe(true);
    const r = await w.submit("m1", { pullNumber: pull, existingBranch: branch, body: "late", cover: false });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(w.fake.readText("main", AI("intro-to-transformers"))).not.toContain("late");
  });

  it("reviewing a merged/closed PR is refused", async () => {
    const { pull } = await w.submit("m1");
    await w.review("h1", pull, "approve");
    const r = await w.review("sa1", pull, "approve", { sha: w.fake.headSha(pull) });
    expect(r.status).toBe(400);
  });
});

describe("11. image tricks", () => {
  const noTrace = (before: ReturnType<typeof w.fake.mutations>["length"]) => {
    expect(w.fake.branches("draft/")).toEqual([]);
    expect(w.fake.pulls).toHaveLength(0);
    expect(w.fake.mutations().length).toBe(before);
  };
  const ph = "blob:http://localhost:3001/x-1";
  const pending = (filename: string, bytes: Buffer | string) => [
    { filename, base64: (typeof bytes === "string" ? Buffer.from(bytes) : bytes).toString("base64"), placeholderUrl: ph },
  ];

  it("an svg is rejected with a clear error and leaves no branch", async () => {
    const r = await w.submit("m1", { cover: false, markdownBody: `![x](${ph})`, coverImage: ph, pendingImages: pending("logo.svg", "<svg xmlns='http://www.w3.org/2000/svg'/>") });
    expect(r.status).toBe(500);
    expect(r.json.error).toMatch(/rejected.*JPG, PNG, WebP or GIF/);
    noTrace(0);
  });

  it("a .png filename carrying html bytes is rejected", async () => {
    const r = await w.submit("m1", { cover: false, markdownBody: `![x](${ph})`, coverImage: ph, pendingImages: pending("pic.png", "<html><script>alert(1)</script></html>") });
    expect(r.status).toBe(500);
    expect(r.json.error).toContain("pic.png");
    noTrace(0);
  });

  it("an image over 3 MB is rejected", async () => {
    const big = Buffer.concat([Buffer.from(PNG_B64, "base64"), Buffer.alloc(3 * 1024 * 1024)]);
    const r = await w.submit("m1", { cover: false, markdownBody: `![x](${ph})`, coverImage: ph, pendingImages: pending("big.png", big) });
    expect(r.status).toBe(500);
    expect(r.json.error).toMatch(/3 MB/);
    noTrace(0);
  });

  it("a valid image next to a bad one -> nothing is written (valid one is not left behind)", async () => {
    const r = await w.submit("m1", {
      cover: false,
      markdownBody: `![a](${ph}) ![b](blob:http://localhost:3001/x-2)`,
      coverImage: ph,
      pendingImages: [
        { filename: "ok.png", base64: PNG_B64, placeholderUrl: ph },
        { filename: "bad.gif.exe", base64: PNG_B64, placeholderUrl: "blob:http://localhost:3001/x-2" },
      ],
    });
    expect(r.status).toBe(500);
    noTrace(0);
  });

  it("a blob: URL in the body with no pendingImages is rejected before any write", async () => {
    const r = await w.submit("m1", { cover: false, markdownBody: "text ![x](blob:http://localhost:3001/never-uploaded)", pendingImages: [] });
    expect(r.status).toBe(500);
    expect(r.json.error).toMatch(/never uploaded/);
    noTrace(0);
  });

  it("an unresolved blob: cover image is rejected before any write", async () => {
    const r = await w.submit("m1", { cover: false, markdownBody: "plain body", coverImage: "blob:http://localhost:3001/cover", pendingImages: [] });
    expect(r.status).toBe(500);
    noTrace(0);
  });

  it("an inline data: image in the body is rejected before any write", async () => {
    const r = await w.submit("m1", { cover: false, markdownBody: `![x](data:image/png;base64,${PNG_B64})`, pendingImages: [] });
    expect(r.status).toBe(500);
    noTrace(0);
  });

  it("a malformed vertical is rejected before any write", async () => {
    const r = await w.submit("m1", { vertical: "../../etc", cover: false });
    expect(r.status).toBe(400);
    noTrace(0);
  });

  it("a failure AFTER the branch was created cleans the branch up (contents write fails)", async () => {
    w.fake.failWhen(({ method, path }) => (method === "PUT" && path.includes("/contents/") ? 500 : undefined));
    const r = await w.submit("m1");
    expect(r.status).toBe(500);
    expect(w.fake.branches("draft/")).toEqual([]);
    expect(w.fake.pulls).toHaveLength(0);
  });
});

describe("auth plumbing", () => {
  it("no token / bad token -> 401, nothing written", async () => {
    expect((await w.call(null, "GET", "/api/posts/reviews")).status).toBe(401);
    const r = await w.call(null, "POST", "/api/posts/draft", { vertical: "ai-ml", title: "x", markdownBody: "y" });
    expect(r.status).toBe(401);
    expect(w.fake.mutations()).toHaveLength(0);
  });
});
