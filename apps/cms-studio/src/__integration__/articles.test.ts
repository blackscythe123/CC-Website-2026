import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import matter from "gray-matter";
import { makeWorld, PNG_B64, UPLOADS, articleMd, type World } from "./harness";

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

describe("1. member submits an article with a cover image", () => {
  it("creates one draft branch holding exactly the .md and the png, and an open PR", async () => {
    const mainBefore = w.mainTip();
    const r = await w.submit("m1");
    expect(r.status).toBe(200);
    expect(r.branch).toMatch(/^draft\/ai-ml\/intro-to-transformers-\d{5}$/);

    const changed = w.fake.changedFiles(r.branch);
    expect(changed).toHaveLength(2);
    const md = changed.find((f) => f.filename === AI("intro-to-transformers"))!;
    const png = changed.find((f) => f.filename.startsWith(`${UPLOADS}/`))!;
    expect(md.status).toBe("added");
    expect(png.status).toBe("added");
    expect(png.filename).toMatch(/\/\d+-cover\.png$/);

    const fm = matter(w.fake.readText(r.branch, AI("intro-to-transformers"))!);
    expect(fm.data.coverImage).toBe(`/uploads/${png.filename.split("/").pop()}`);
    expect(fm.content).not.toContain("blob:");
    expect(fm.content).toContain(fm.data.coverImage);
    expect(fm.data.authorUsername).toBe("m1");
    expect(fm.data.vertical).toBe("ai-ml");
    expect(w.fake.readFile(r.branch, png.filename)!.equals(Buffer.from(PNG_B64, "base64"))).toBe(true);

    const pr = w.fake.pull(r.pull);
    expect(pr).toMatchObject({ state: "open", merged: false, user: "m1", headRef: r.branch, baseRef: "main" });
    expect(w.mainTip()).toBe(mainBefore); // nothing touched main
    expect(w.fake.readFile("main", AI("intro-to-transformers"))).toBeNull();
  });

  it("an outsider with no role / no repo access cannot submit and nothing is written", async () => {
    const r = await w.submit("x1");
    expect(r.status).toBe(403);
    expect(w.fake.mutations()).toHaveLength(0);
  });

  it("a member cannot submit to a vertical they do not belong to", async () => {
    const r = await w.submit("m1", { vertical: "full-stack" });
    expect(r.status).toBe(403);
    expect(w.fake.mutations()).toHaveLength(0);
  });
});

describe("2. deputy quorum for a member article", () => {
  it("d1 approve -> recorded, not merged (1/2); d2 approve -> squash merged", async () => {
    const { pull, branch } = await w.submit("m1");
    const head = w.fake.headSha(pull);

    const a1 = await w.review("d1", pull, "approve");
    expect(a1.status).toBe(200);
    expect(a1.json.merged).toBe(false);
    expect(a1.json.message).toContain("1/2");
    expect(w.fake.pull(pull).state).toBe("open");
    expect(w.fake.readFile("main", AI("intro-to-transformers"))).toBeNull();
    expect(w.fake.reviewsOf(pull)).toMatchObject([{ user: { login: "d1" }, state: "APPROVED", commit_id: head }]);

    const a2 = await w.review("d2", pull, "approve");
    expect(a2.status).toBe(200);
    expect(a2.json.merged).toBe(true);
    expect(w.fake.pull(pull)).toMatchObject({ state: "closed", merged: true });
    expect(w.fake.readText("main", AI("intro-to-transformers"))).toContain("Intro to Transformers");
    const tip = w.fake.history("main")[0];
    expect(tip.message.split("\n")[0]).toBe(`feat(ai-ml): Intro to Transformers (#${pull})`);
    expect(tip.message).toContain("Authored-by: @m1");
    expect(tip.message).toContain("Approved-by: @d2");
    expect(w.fake.hasBranch(branch)).toBe(false);
    // the cover image reached main with the article
    expect(w.fake.listFiles("main").filter((f) => f.startsWith(UPLOADS) && f.endsWith("cover.png"))).toHaveLength(1);
    expect(w.fake.reviewsOf(pull).map((r) => r.user.login)).toEqual(["d1", "d2"]);
  });

  it("the same deputy approving twice does not count twice", async () => {
    const { pull } = await w.submit("m1");
    await w.review("d1", pull, "approve");
    const again = await w.review("d1", pull, "approve");
    expect(again.json.merged).toBe(false);
    expect(again.json.message).toContain("1/2");
    expect(w.fake.pull(pull).merged).toBe(false);
  });
});

describe("3. stale approvals do not count after a revision", () => {
  it("d1 approves, m1 pushes a revision, d2 approving is NOT enough; d1 re-approving then merges", async () => {
    const { pull, branch } = await w.submit("m1");
    await w.review("d1", pull, "approve");
    const oldHead = w.fake.headSha(pull);

    const rev = await w.submit("m1", { pullNumber: pull, existingBranch: branch, body: "Revised body.", cover: false });
    expect(rev.status).toBe(200);
    const newHead = w.fake.headSha(pull);
    expect(newHead).not.toBe(oldHead);
    expect(w.fake.readText(branch, AI("intro-to-transformers"))).toContain("Revised body.");

    const a2 = await w.review("d2", pull, "approve");
    expect(a2.status).toBe(200);
    expect(a2.json.merged).toBe(false);
    expect(a2.json.message).toContain("1/2");
    expect(w.fake.pull(pull).merged).toBe(false);
    expect(w.fake.readFile("main", AI("intro-to-transformers"))).toBeNull();

    const a1 = await w.review("d1", pull, "approve");
    expect(a1.json.merged).toBe(true);
    expect(w.fake.readText("main", AI("intro-to-transformers"))).toContain("Revised body.");
  });
});

describe("4. expectedHeadSha is enforced", () => {
  it("a stale/wrong sha -> 409 and nothing is recorded", async () => {
    const { pull } = await w.submit("m1");
    const wrong = "a".repeat(40);
    const r = await w.review("d1", pull, "approve", { sha: wrong });
    expect(r.status).toBe(409);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
    expect(w.fake.pull(pull).merged).toBe(false);
    const rr = await w.review("d1", pull, "reject", { sha: wrong, reason: "nope" });
    expect(rr.status).toBe(409);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
    expect(w.fake.commentsOf(pull)).toEqual([]);
  });

  it("a malformed / missing sha -> 400 and nothing recorded", async () => {
    const { pull } = await w.submit("m1");
    for (const sha of ["", "abc", undefined]) {
      const r = await w.call("d1", "POST", "/api/posts/reviews", { pullNumber: pull, action: "approve", expectedHeadSha: sha });
      expect(r.status).toBe(400);
    }
    expect(w.fake.reviewsOf(pull)).toEqual([]);
  });
});

describe("5. head / superadmin / self / contributor rules", () => {
  it("h1 approving a member's article merges immediately", async () => {
    const { pull } = await w.submit("m1");
    const r = await w.review("h1", pull, "approve");
    expect(r.status).toBe(200);
    expect(r.json.merged).toBe(true);
    expect(w.fake.readText("main", AI("intro-to-transformers"))).toBeTruthy();
    expect(w.fake.history("main")[0].message).toContain("Approved-by: @h1");
  });

  it("h1 approving ANOTHER head's article (full-stack, h2) is refused", async () => {
    const { pull, status } = await w.submit("h2", { vertical: "full-stack", title: "Web Things", slug: "web-things" });
    expect(status).toBe(200);
    const r = await w.review("h1", pull, "approve");
    expect(r.status).toBe(403);
    expect(w.fake.pull(pull).merged).toBe(false);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
  });

  it("the vertical's head has full control there: h1 may publish a superadmin's ai-ml article", async () => {
    const { pull } = await w.submit("sa1", { title: "Superadmin Take", slug: "superadmin-take" });
    expect((await w.review("d1", pull, "approve")).status).toBe(403);
    const r = await w.review("h1", pull, "approve");
    expect(r.status).toBe(200);
    expect(r.json.merged).toBe(true);
    expect(w.fake.readText("main", AI("superadmin-take"))).toBeTruthy();
  });

  it("a head publishes their own ai-ml article; deputies and other verticals' heads cannot", async () => {
    const { pull } = await w.submit("h1", { title: "Head Article", slug: "head-article" });
    expect((await w.review("d1", pull, "approve")).status).toBe(403);
    expect((await w.review("h2", pull, "approve")).status).toBe(403);
    expect(w.fake.pull(pull).merged).toBe(false);
    const ok = await w.review("h1", pull, "approve");
    expect(ok.json.merged).toBe(true);
  });

  it("a superadmin publishes their own article without anyone else", async () => {
    const { pull } = await w.submit("sa1", { title: "SA Post", slug: "sa-post" });
    const self = await w.review("sa1", pull, "approve", { sha: w.fake.headSha(pull) });
    expect(self.status).toBe(200);
    expect(self.json.merged).toBe(true);
    expect(w.fake.readText("main", AI("sa-post"))).toBeTruthy();
  });

  it("deputies and members can never approve or reject their own article", async () => {
    const { pull } = await w.submit("d1", { title: "Deputy Post", slug: "deputy-post" });
    for (const action of ["approve", "reject"] as const) {
      const r = await w.review("d1", pull, action, { sha: w.fake.headSha(pull), reason: "x" });
      expect(r.status).toBe(403);
    }
    expect(w.fake.reviewsOf(pull)).toEqual([]);
  });

  it("a superadmin who revised a member's PR may still publish it (full control); the byline stays the member's", async () => {
    const { pull, branch } = await w.submit("m1");
    const rev = await w.submit("sa1", { pullNumber: pull, existingBranch: branch, body: "Edited by sa1.", cover: false });
    expect(rev.status).toBe(200);
    expect(matter(w.fake.readText(branch, AI("intro-to-transformers"))!).data.authorUsername).toBe("m1");
    const ok = await w.review("sa1", pull, "approve");
    expect(ok.status).toBe(200);
    expect(ok.json.merged).toBe(true);
  });

  it("a deputy who pushed a commit to the PR is excluded from the deputy count", async () => {
    // d1 cannot revise (only author or superadmin may), so model a commit pushed outside the CMS
    const { pull, branch } = await w.submit("m1");
    w.fake.push(branch, { [AI("intro-to-transformers")]: articleMd({ title: "Intro to Transformers", vertical: "ai-ml", author: "m1", body: "tweak" }) }, { author: "d1" });
    const r1 = await w.review("d1", pull, "approve");
    expect(r1.status).toBe(403);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
  });
});

describe("6. cross-vertical and peer restrictions", () => {
  it("d3 (deputy of full-stack, member of ai-ml) cannot approve or reject an ai-ml article", async () => {
    const { pull } = await w.submit("m1");
    const a = await w.review("d3", pull, "approve", { sha: w.fake.headSha(pull) });
    expect(a.status).toBe(403);
    const rj = await w.review("d3", pull, "reject", { sha: w.fake.headSha(pull), reason: "no" });
    expect(rj.status).toBe(403);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
    expect(w.fake.commentsOf(pull)).toEqual([]);
  });

  it("d3 as an ai-ml MEMBER can still submit there, and d1/d2 review it as a member article", async () => {
    const { pull, status } = await w.submit("d3", { title: "D3 In AI", slug: "d3-in-ai" });
    expect(status).toBe(200);
    await w.review("d1", pull, "approve");
    const r = await w.review("d2", pull, "approve");
    expect(r.json.merged).toBe(true);
  });

  it("d1 cannot approve or reject d2's article", async () => {
    const { pull } = await w.submit("d2", { title: "Deputy Two", slug: "deputy-two" });
    const sha = w.fake.headSha(pull);
    expect((await w.review("d1", pull, "approve", { sha })).status).toBe(403);
    expect((await w.review("d1", pull, "reject", { sha, reason: "meh" })).status).toBe(403);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
    expect(w.fake.commentsOf(pull)).toEqual([]);
    // the vertical head can
    expect((await w.review("h1", pull, "approve")).json.merged).toBe(true);
  });

  it("an outsider and a plain member cannot review", async () => {
    const { pull } = await w.submit("m1");
    const sha = w.fake.headSha(pull);
    expect((await w.review("x1", pull, "approve", { sha })).status).toBe(403);
    expect((await w.review("m2", pull, "approve", { sha })).status).toBe(403);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
  });
});

describe("7. request changes", () => {
  it("d1 requests changes -> REQUEST_CHANGES on head + comment; list shows it; revision clears it", async () => {
    const { pull, branch } = await w.submit("m1");
    const head = w.fake.headSha(pull);
    const r = await w.review("d1", pull, "reject", { reason: "Please add benchmarks." });
    expect(r.status).toBe(200);
    expect(w.fake.reviewsOf(pull)).toMatchObject([{ user: { login: "d1" }, state: "CHANGES_REQUESTED", commit_id: head }]);
    expect(w.fake.reviewsOf(pull)[0].body).toContain("Please add benchmarks.");
    expect(w.fake.commentsOf(pull).some((c) => c.body.includes("Editorial Feedback & Rejection") && c.body.includes("Please add benchmarks."))).toBe(true);
    expect(w.fake.pull(pull).state).toBe("open");

    const entry = await w.listEntry("m1", pull);
    expect(entry.changesRequested).toBe(true);
    expect(entry.latestFeedback).toContain("Please add benchmarks.");

    const rev = await w.submit("m1", { pullNumber: pull, existingBranch: branch, body: "Now with benchmarks.", cover: false });
    expect(rev.status).toBe(200);
    const after = await w.listEntry("m1", pull);
    expect(after.changesRequested).toBe(false);
    expect(after.headSha).toBe(w.fake.headSha(pull));
    expect(after.approvers).toEqual([]);
  });

  it("a reason is mandatory", async () => {
    const { pull } = await w.submit("m1");
    const r = await w.review("d1", pull, "reject", { reason: "  " });
    expect(r.status).toBe(400);
    expect(w.fake.reviewsOf(pull)).toEqual([]);
  });
});

describe("review-queue visibility", () => {
  it("authors see their own; reviewers of the vertical see it; other members / outsiders / other-vertical staff do not", async () => {
    const { pull } = await w.submit("m1");
    const seen = async (u: string) => ((await w.call(u, "GET", "/api/posts/reviews")).json.prs as any[]).map((p) => p.number);
    for (const u of ["m1", "d1", "d2", "h1", "sa1", "sa2"]) expect(await seen(u), u).toContain(pull);
    for (const u of ["m2", "x1", "h2", "d3"]) expect(await seen(u), u).not.toContain(pull);
  });
});

describe("8. club announcements", () => {
  it("only superadmins can submit; head cannot approve; sa2 can", async () => {
    for (const u of ["h1", "d1", "m1", "x1"]) {
      const r = await w.submit(u, { vertical: "club", title: "Club News", slug: "club-news", cover: false });
      expect(r.status, u).toBe(403);
    }
    expect(w.fake.mutations()).toHaveLength(0);

    const { pull, status } = await w.submit("sa1", { vertical: "club", title: "Club News", slug: "club-news", cover: false });
    expect(status).toBe(200);
    expect(w.fake.changedFiles(w.fake.pull(pull).headRef).map((f) => f.filename)).toEqual(["content/club/posts/club-news.md"]);
    expect((await w.review("h1", pull, "approve", { sha: w.fake.headSha(pull) })).status).toBe(403);
    expect((await w.review("d1", pull, "approve", { sha: w.fake.headSha(pull) })).status).toBe(403);
    expect(w.fake.pull(pull).merged).toBe(false);
    const ok = await w.review("sa2", pull, "approve");
    expect(ok.json.merged).toBe(true);
    expect(w.fake.readText("main", "content/club/posts/club-news.md")).toContain("Club News");
    expect(w.fake.history("main")[0].message.split("\n")[0]).toBe(`feat(club): Club News (#${pull})`);
  });
});

describe("preview access", () => {
  it("lets the author and that vertical's reviewers preview a draft, but not outsiders or other verticals", async () => {
    const r = await w.submit("m1");
    expect(r.status).toBe(200);
    const path = `/api/posts/reviews?previewPullNumber=${r.pull}`;
    expect((await w.call("m1", "GET", path)).status).toBe(200); // author
    expect((await w.call("d1", "GET", path)).status).toBe(200); // ai-ml deputy
    expect((await w.call("h1", "GET", path)).status).toBe(200); // ai-ml head
    expect((await w.call("sa1", "GET", path)).status).toBe(200); // superadmin
    expect((await w.call("x1", "GET", path)).status).toBe(403); // no club role
    expect((await w.call("m2", "GET", path)).status).toBe(403); // ai-ml member, not a reviewer
    expect((await w.call("d3", "GET", path)).status).toBe(403); // deputy of full-stack, member of ai-ml
  });
});
