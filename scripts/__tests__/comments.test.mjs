import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseCommentsConfig } from "../../packages/content-schema/src/comments.mjs";

const base = { enabled: true, repo: "blackscythe123/CC-Website-2026", repoId: "R_kgDOVDzCDw", category: "Comments", categoryId: "DIC_kwDOVDzCD84Cx", disabledVerticals: [] };

test("parseCommentsConfig accepts a full config and keeps comments off unless it is fully valid", () => {
  assert.deepEqual(parseCommentsConfig(base), { config: base, errors: [] });
  assert.equal(parseCommentsConfig({ ...base, enabled: false, categoryId: "" }).config?.enabled, false);
  for (const bad of [
    { ...base, categoryId: "" },
    { ...base, repoId: "nope" },
    { ...base, repo: "x" },
    { ...base, enabled: "yes" },
    { ...base, extra: 1 },
    { ...base, disabledVerticals: ["../x"] },
    null,
    [],
  ]) {
    const r = parseCommentsConfig(bad);
    assert.equal(r.config, null, JSON.stringify(bad));
    assert.ok(r.errors.length > 0);
  }
});

test("validate-content: comments.json must be valid and giscus.json must allow every portal when enabled", () => {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-comments-"));
  const run = () => {
    const r = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "validate-content.mjs")], { cwd: tmp, encoding: "utf8" });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  };
  try {
    fs.cpSync(path.join(repoRoot, "content"), path.join(tmp, "content"), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, "giscus.json"), path.join(tmp, "giscus.json"));
    const file = path.join(tmp, "content", "club", "comments.json");
    assert.equal(run().status, 0); // the committed config (comments off) passes

    fs.writeFileSync(file, JSON.stringify(base));
    assert.equal(run().status, 0, run().out); // enabled + all portals in origins

    const portals = JSON.parse(fs.readFileSync(path.join(tmp, "content", "club", "portals.json"), "utf8"));
    fs.writeFileSync(path.join(tmp, "giscus.json"), JSON.stringify({ origins: [`https://${portals[0].domain}`] }));
    const missing = run();
    assert.equal(missing.status, 1);
    assert.match(missing.out, /not in giscus\.json origins/);

    fs.writeFileSync(file, JSON.stringify({ ...base, categoryId: "" }));
    assert.equal(run().status, 1);
    fs.writeFileSync(file, "{not json");
    assert.equal(run().status, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
