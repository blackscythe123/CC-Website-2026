import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { shouldDeployApp, DEPLOYABLE_APPS } from "../lib/affected-apps.mjs";

// Fixture workspace under the OS temp dir (never inside the project).
const root = fs.mkdtempSync(path.join(os.tmpdir(), "affected-apps-"));
function pkg(rel, json) {
  fs.mkdirSync(path.join(root, rel), { recursive: true });
  fs.writeFileSync(path.join(root, rel, "package.json"), JSON.stringify(json));
}
pkg("packages/ui", { name: "@coding-club/ui", dependencies: { "@coding-club/schema": "workspace:*" } });
pkg("packages/schema", { name: "@coding-club/schema" });
pkg("packages/lonely", { name: "@coding-club/lonely" });
pkg("apps/main-portal", { name: "main-portal", dependencies: { "@coding-club/ui": "workspace:*" } });
pkg("apps/cms-studio", { name: "cms-studio", dependencies: { next: "1" } });
pkg("apps/oss-portal", { name: "@coding-club/oss-portal", devDependencies: { "@coding-club/schema": "workspace:*" } });
pkg("apps/cp-portal", { name: "@coding-club/cp-portal" });
test.after(() => fs.rmSync(root, { recursive: true, force: true }));

const opts = { repoRoot: root };
const deploys = (app, files) => shouldDeployApp(app, files, opts).build;

test("package change only redeploys its consumers", () => {
  assert.equal(deploys("main-portal", ["packages/ui/src/a.tsx"]), true);
  assert.equal(deploys("cms-studio", ["packages/ui/src/a.tsx"]), false);
  assert.equal(deploys("cp-portal", ["packages/ui/src/a.tsx"]), false);
  assert.equal(deploys("oss-portal", ["packages/ui/src/a.tsx"]), false);
});

test("transitive dependency: schema change reaches ui consumers and direct consumers", () => {
  assert.equal(deploys("main-portal", ["packages/schema/index.ts"]), true);
  assert.equal(deploys("oss-portal", ["packages/schema/index.ts"]), true);
  assert.equal(deploys("cms-studio", ["packages/schema/index.ts"]), false);
});

test("package with no consumers deploys nothing", () => {
  for (const app of ["main-portal", "cms-studio", "oss-portal", "cp-portal"]) {
    assert.equal(deploys(app, ["packages/lonely/x.ts"]), false);
  }
});

test("unknown package falls back to deploying everything", () => {
  assert.equal(deploys("cms-studio", ["packages/ghost/x.ts"]), true);
  assert.equal(deploys("cp-portal", ["packages/loose-file.txt"]), true);
});

test("root configs redeploy every app", () => {
  for (const f of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json"]) {
    for (const app of ["main-portal", "cms-studio", "cp-portal"]) assert.equal(deploys(app, [f]), true, `${app} ${f}`);
  }
});

test("docs, scripts and workflows deploy nothing", () => {
  assert.equal(deploys("main-portal", ["docs/a.md", "scripts/x.mjs", ".github/workflows/content-ci.yml"]), false);
});

test("own app, content and cms-studio rules still hold", () => {
  assert.equal(deploys("cms-studio", ["apps/cms-studio/src/a.ts"]), true);
  assert.equal(deploys("cms-studio", ["content/club/posts/a.md"]), false);
  assert.equal(deploys("main-portal", ["content/club/posts/a.md"]), true);
  assert.equal(deploys("oss-portal", ["content/verticals/open-source/posts/a.md"]), true);
  assert.equal(deploys("oss-portal", ["content/verticals/ai-ml/posts/a.md"]), false);
});

test("real repo: scrapbook-ui does not redeploy cms-studio but does redeploy main-portal", () => {
  const files = ["packages/scrapbook-ui/src/components/X.tsx"];
  assert.equal(shouldDeployApp("cms-studio", files).build, false);
  assert.equal(shouldDeployApp("main-portal", files).build, true);
  assert.ok(DEPLOYABLE_APPS.includes("cms-studio"));
});
