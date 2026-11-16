import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { validateTrack, isYouTubeUrl, trackItems } from "../../packages/content-schema/src/tracks.mjs";

const V = "competitive-programming";
const good = () => ({
  title: "DSA",
  summary: "x",
  vertical: V,
  topics: [
    {
      title: "Arrays",
      items: [
        { id: "a1", type: "post", slug: "two-pointers" },
        { id: "a2", type: "link", title: "Two Sum", url: "https://leetcode.com/problems/two-sum/", difficulty: "easy" },
      ],
      subtopics: [{ title: "Videos", items: [{ id: "a3", type: "video", title: "Intro", url: "https://youtu.be/dQw4w9WgXcQ" }] }],
    },
  ],
});

test("a well-formed track passes", () => {
  const r = validateTrack(good(), { vertical: V, slug: "dsa", postSlugs: ["two-pointers"] });
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.deepEqual(trackItems(r.track).map((i) => i.id), ["a1", "a2", "a3"]);
});

test("rejects unsafe or malformed data with readable errors", () => {
  const cases = [
    [(t) => (t.topics[0].items[1].url = "javascript:alert(1)"), /https link/],
    [(t) => (t.topics[0].items[1].url = "https://user:pw@evil.com/"), /https link/],
    [(t) => (t.topics[0].items[1].url = "http://leetcode.com/"), /https link/],
    [(t) => (t.topics[0].subtopics[0].items[0].url = "https://vimeo.com/1"), /YouTube/],
    [(t) => (t.topics[0].items[0].slug = "../etc"), /kebab-case/],
    [(t) => (t.topics[0].items[1].id = "A B"), /lowercase/],
    [(t) => (t.topics[0].items[1].onclick = "x"), /Unrecognized key/i],
    [(t) => (t.topics[0].items[1].difficulty = "insane"), /difficulty/],
    [(t) => (t.topics = []), /at least one topic/],
    [(t) => (t.title = ""), /empty/],
  ];
  for (const [mutate, expected] of cases) {
    const t = good();
    mutate(t);
    const r = validateTrack(t, { vertical: V, slug: "dsa", postSlugs: ["two-pointers"] });
    assert.equal(r.ok, false, `should fail: ${mutate}`);
    assert.match(r.errors.join(" | "), expected);
  }
});

test("rejects duplicate ids, missing posts, wrong folder and bad file names", () => {
  const dup = good();
  dup.topics[0].items[1].id = "a1";
  assert.match(validateTrack(dup, { vertical: V }).errors.join(), /more than once/);
  assert.match(validateTrack(good(), { vertical: V, postSlugs: [] }).errors.join(), /isn't published/);
  assert.match(validateTrack(good(), { vertical: "ai-ml" }).errors.join(), /folder/);
  assert.match(validateTrack(good(), { vertical: V, slug: "Bad_Name" }).errors.join(), /kebab-case/);
});

test("isYouTubeUrl matches the embed parser's rules", () => {
  assert.equal(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isYouTubeUrl("https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG"), true);
  assert.equal(isYouTubeUrl("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"), false);
});

test("validate-content fails CI on a broken track and passes on the real repo", () => {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  const run = (cwd) => {
    try {
      execFileSync(process.execPath, [path.join(repoRoot, "scripts", "validate-content.mjs")], { cwd, stdio: "pipe" });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(run(repoRoot), 0);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-tracks-"));
  fs.cpSync(path.join(repoRoot, "content"), path.join(tmp, "content"), { recursive: true });
  const dir = path.join(tmp, "content", "verticals", V, "tracks");
  fs.mkdirSync(dir, { recursive: true });
  const bad = good();
  bad.topics[0].items[0].slug = "no-such-post";
  fs.writeFileSync(path.join(dir, "broken.json"), JSON.stringify(bad));
  try {
    assert.equal(run(tmp), 1);
    fs.rmSync(path.join(dir, "broken.json"));
    fs.writeFileSync(path.join(dir, "notes.md"), "# not allowed here");
    assert.equal(run(tmp), 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
