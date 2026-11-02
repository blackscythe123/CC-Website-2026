// Usage:
//   node scripts/detect-changed-apps.mjs --bases <bases.json> <headSha>   (per-app base, used by CI)
//   node scripts/detect-changed-apps.mjs <baseSha|""> <headSha>           (one base for every app)
//   node scripts/detect-changed-apps.mjs "" <headSha> --all               (force every app)
// Prints the apps that need a production deploy and writes `apps=<json array>` to $GITHUB_OUTPUT.
// An app with no usable base (never deployed, or base not in history) is always deployed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { DEPLOYABLE_APPS, shouldDeployApp } from "./lib/affected-apps.mjs";

const args = process.argv.slice(2);

function emit(apps) {
  const json = JSON.stringify(apps);
  console.log(`[detect] Apps to deploy: ${json}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `apps=${json}\n`);
}

function commitExists(sha) {
  if (!sha || /^0+$/.test(sha)) return false;
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const diffCache = new Map();
function changedFiles(base, head) {
  const key = `${base}..${head}`;
  if (!diffCache.has(key)) {
    const out = execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" });
    diffCache.set(key, out.split("\n").map((f) => f.trim()).filter(Boolean));
  }
  return diffCache.get(key);
}

function decide(app, base, head) {
  if (!commitExists(base)) {
    console.log(`[detect] ${app}: DEPLOY - no usable base commit ('${base || ""}').`);
    return true;
  }
  const files = changedFiles(base, head);
  const { build, reason } = shouldDeployApp(app, files);
  console.log(`[detect] ${app}: ${build ? "DEPLOY" : "skip"} - ${files.length} file(s) since ${base.slice(0, 7)}. ${reason}`);
  return build;
}

if (args.includes("--all")) {
  console.log("[detect] Forced full deploy requested.");
  emit(DEPLOYABLE_APPS);
  process.exit(0);
}

if (args[0] === "--bases") {
  const [, basesFile, headArg] = args;
  const head = headArg || "HEAD";
  let bases = {};
  try {
    bases = JSON.parse(fs.readFileSync(basesFile, "utf8"));
  } catch {
    console.log(`[detect] Could not read ${basesFile}; every app will deploy.`);
  }
  emit(DEPLOYABLE_APPS.filter((app) => decide(app, bases[app], head)));
  process.exit(0);
}

const [baseArg = "", headArg = "HEAD"] = args;
emit(DEPLOYABLE_APPS.filter((app) => decide(app, baseArg, headArg || "HEAD")));
