// Usage: node scripts/detect-changed-apps.mjs <baseSha|""> <headSha> [--all]
// Prints the apps that need a production deploy and writes `apps=<json array>` to $GITHUB_OUTPUT.
// An empty/unknown base SHA (first run, force-push past history) deploys every app.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { DEPLOYABLE_APPS, shouldDeployApp } from "./lib/affected-apps.mjs";

const [baseArg = "", headArg = "HEAD", flag] = process.argv.slice(2);
const head = headArg || "HEAD";

function emit(apps) {
  const json = JSON.stringify(apps);
  console.log(`[detect] Apps to deploy: ${json}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `apps=${json}\n`);
}

function commitExists(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (flag === "--all") {
  console.log("[detect] Forced full deploy requested.");
  emit(DEPLOYABLE_APPS);
  process.exit(0);
}

if (!baseArg || /^0+$/.test(baseArg) || !commitExists(baseArg)) {
  console.log(`[detect] No usable base commit ('${baseArg}'). Deploying every app as a safe fallback.`);
  emit(DEPLOYABLE_APPS);
  process.exit(0);
}

const changed = execFileSync("git", ["diff", "--name-only", baseArg, head], { encoding: "utf8" })
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);

console.log(`[detect] ${changed.length} file(s) changed between ${baseArg.slice(0, 7)} and ${head.slice(0, 7)}.`);

const apps = DEPLOYABLE_APPS.filter((app) => {
  const { build, reason } = shouldDeployApp(app, changed);
  console.log(`[detect] ${app}: ${build ? "DEPLOY" : "skip"} - ${reason}`);
  return build;
});

emit(apps);
