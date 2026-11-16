import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  validateTrack,
  isYouTubeUrl,
  trackItems,
  parsePlacement,
  placementErrors,
  placementLabel,
} from "../../packages/content-schema/src/tracks.mjs";

const V = "competitive-programming";
const good = () => ({
  title: "DSA",
  summary: "x",
  vertical: V,
  topics: [
    {
      id: "arrays",
      title: "Arrays",
      description: "Line one\nLine two",
      items: [{ id: "a2", type: "link", title: "Two Sum", url: "https://leetcode.com/problems/two-sum/", difficulty: "easy", description: "warm-up" }],
      subtopics: [
        { id: "videos", title: "Videos", items: [{ id: "a3", type: "video", title: "Intro", url: "https://youtu.be/dQw4w9WgXcQ" }] },
        { id: "empty-for-blogs", title: "Filled by blogs" },
      ],
    },
    { id: "dp", title: "DP" },
  ],
});

test("a well-formed v3.1 track passes (empty sections allowed)", () => {
  const r = validateTrack(good(), { vertical: V, slug: "dsa" });
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.deepEqual(trackItems(r.track).map((i) => i.id), ["a2", "a3"]);
});

test("rejects unsafe or malformed data with readable errors", () => {
  const cases = [
    [(t) => (t.topics[0].items[0].url = "javascript:alert(1)"), /https link/],
    [(t) => (t.topics[0].items[0].url = "https://user:pw@evil.com/"), /https link/],
    [(t) => (t.topics[0].items[0].url = "http://leetcode.com/"), /https link/],
    [(t) => (t.topics[0].subtopics[0].items[0].url = "https://vimeo.com/1"), /YouTube/],
    [(t) => (t.topics[0].items[0].id = "A B"), /lowercase/],
    [(t) => (t.topics[0].items[0].onclick = "x"), /Unrecognized key/i],
    [(t) => (t.topics[0].items[0].difficulty = "insane"), /difficulty/],
    [(t) => (t.topics[0].items[0].description = "x".repeat(501)), /500/],
    [(t) => (t.topics[0].description = "x".repeat(1001)), /1000/],
    [(t) => (t.topics = []), /at least one topic/],
    [(t) => (t.title = ""), /empty/],
    [(t) => delete t.topics[0].id, /topics\.0\.id/],
    [(t) => (t.topics[0].id = "2024"), /start with a letter/],
    [(t) => (t.topics[0].subtopics[0].id = "Bad_Id"), /kebab-case/],
    [(t) => (t.topics[0].items[0] = { id: "p1", type: "post", slug: "x" }), /placement, not as items/],
  ];
  for (const [mutate, expected] of cases) {
    const t = good();
    mutate(t);
    const r = validateTrack(t, { vertical: V, slug: "dsa" });
    assert.equal(r.ok, false, `should fail: ${mutate}`);
    assert.match(r.errors.join(" | "), expected, `${mutate}`);
  }
});

test("rejects duplicate item ids, duplicate section ids (shared namespace), wrong folder and bad file names", () => {
  const dup = good();
  dup.topics[0].subtopics[0].items[0].id = "a2";
  assert.match(validateTrack(dup, { vertical: V }).errors.join(), /Item id "a2" is used more than once/);
  const dupSection = good();
  dupSection.topics[1].id = "videos"; // same as a subtopic id
  assert.match(validateTrack(dupSection, { vertical: V }).errors.join(), /"videos" is used more than once/);
  assert.match(validateTrack(good(), { vertical: "ai-ml" }).errors.join(), /folder/);
  assert.match(validateTrack(good(), { vertical: V, slug: "Bad_Name" }).errors.join(), /kebab-case/);
});

test("parsePlacement accepts only the strict shape", () => {
  assert.deepEqual(parsePlacement({ track: "dsa", topic: "arrays" }), { track: "dsa", topic: "arrays" });
  assert.deepEqual(parsePlacement({ track: "dsa", topic: "arrays", subtopic: "videos" }), { track: "dsa", topic: "arrays", subtopic: "videos" });
  for (const bad of [undefined, null, "dsa", [], { track: "dsa" }, { track: "dsa", topic: 2024 }, { track: "dsa", topic: "x", extra: 1 }, { track: "../x", topic: "a" }]) {
    assert.equal(parsePlacement(bad), null, JSON.stringify(bad));
  }
});

test("placementErrors and placementLabel resolve track, topic and subtopic", () => {
  const tracks = { dsa: validateTrack(good(), { vertical: V }).track };
  assert.deepEqual(placementErrors({ track: "dsa", topic: "arrays", subtopic: "videos" }, { vertical: V, tracks }), []);
  assert.deepEqual(placementErrors({ track: "dsa", topic: "dp" }, { vertical: V, tracks }), []);
  assert.match(placementErrors({ track: "web", topic: "dp" }, { vertical: V, tracks }).join(), /Track "web"/);
  assert.match(placementErrors({ track: "dsa", topic: "graphs" }, { vertical: V, tracks }).join(), /Topic "graphs"/);
  assert.match(placementErrors({ track: "dsa", topic: "dp", subtopic: "videos" }, { vertical: V, tracks }).join(), /Subtopic "videos"/);
  assert.equal(placementLabel({ track: "dsa", topic: "arrays", subtopic: "videos" }, tracks.dsa), "DSA › Arrays › Videos");
  assert.equal(placementLabel({ track: "dsa", topic: "nope" }, tracks.dsa), null);
});

test("isYouTubeUrl matches the embed parser's rules", () => {
  assert.equal(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isYouTubeUrl("https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG"), true);
  assert.equal(isYouTubeUrl("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"), false);
});

test("validate-content: track and placement rules in CI", () => {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  const run = (cwd) => {
    const r = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "validate-content.mjs")], { cwd, encoding: "utf8" });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  };
  assert.equal(run(repoRoot).status, 0);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-tracks-"));
  try {
    fs.cpSync(path.join(repoRoot, "content"), path.join(tmp, "content"), { recursive: true });
    const tracksDir = path.join(tmp, "content", "verticals", V, "tracks");
    const postsDir = path.join(tmp, "content", "verticals", V, "posts");
    fs.mkdirSync(tracksDir, { recursive: true });
    fs.writeFileSync(path.join(tracksDir, "zz-test.json"), JSON.stringify(good()));
    const post = (name, extra) =>
      fs.writeFileSync(
        path.join(postsDir, `${name}.md`),
        `---\ntitle: "ZZ test ${name}"\ndate: "2026-01-01"\nauthor: "Test Author"\nvertical: "${V}"\n${extra}---\n\nBody.\n`
      );
    const reset = () => {
      for (const f of fs.readdirSync(postsDir)) if (f.startsWith("zz-")) fs.rmSync(path.join(postsDir, f));
    };

    // valid placement passes
    post("zz-ok", "placement:\n  track: zz-test\n  topic: arrays\n  subtopic: videos\n");
    assert.equal(run(tmp).status, 0, run(tmp).out);

    // a blank `placement:` (YAML null) means no placement
    reset();
    post("zz-blank", "placement:\n");
    assert.equal(run(tmp).status, 0, run(tmp).out);

    // dangling placement only warns
    reset();
    post("zz-dangling", "placement:\n  track: zz-test\n  topic: graphs\n");
    const dangling = run(tmp);
    assert.equal(dangling.status, 0, dangling.out);
    assert.match(dangling.out, /Topic "graphs" doesn't exist/);

    // malformed placement fails
    reset();
    post("zz-bad", "placement:\n  track: zz-test\n  topic: 2024\n");
    assert.equal(run(tmp).status, 1);

    // placed post hidden from its own portal fails
    reset();
    post("zz-hidden", "targetPortals:\n  - main-portal\nplacement:\n  track: zz-test\n  topic: dp\n");
    const hidden = run(tmp);
    assert.equal(hidden.status, 1);
    assert.match(hidden.out, /targetPortals doesn't include "cp-portal"/);

    // placement on a club post fails
    reset();
    fs.writeFileSync(
      path.join(tmp, "content", "club", "posts", "zz-club.md"),
      `---\ntitle: "ZZ club"\ndate: "2026-01-01"\nauthor: "Test Author"\nplacement:\n  track: zz-test\n  topic: dp\n---\n\nBody.\n`
    );
    assert.equal(run(tmp).status, 1);
    fs.rmSync(path.join(tmp, "content", "club", "posts", "zz-club.md"));

    // a broken track file and a stray file both fail
    fs.writeFileSync(path.join(tracksDir, "broken.json"), JSON.stringify({ ...good(), topics: [] }));
    assert.equal(run(tmp).status, 1);
    fs.rmSync(path.join(tracksDir, "broken.json"));
    fs.writeFileSync(path.join(tracksDir, "notes.md"), "# not allowed here");
    assert.equal(run(tmp).status, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
