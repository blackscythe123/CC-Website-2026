import { execSync } from "node:child_process";
import path from "node:path";
import { shouldDeployApp } from "./lib/affected-apps.mjs";

// 1. Strictly enforce: ONLY 'main' branch builds on Vercel (skip all draft/PR previews)
const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
if (branch && branch !== "main") {
  console.log(`[ignore-build] Branch '${branch}' is not 'main'. Skipping preview deployment.`);
  process.exit(0);
}

// Auto-detect target app from CLI argument or current working directory basename
const detectedApp = path.basename(process.cwd());
const targetApp = process.argv[2] || (detectedApp !== "scripts" && detectedApp !== "coding-club-cms" ? detectedApp : "main-portal");

console.log(`[ignore-build] Target application evaluated: '${targetApp}'`);

// 3. Inspect git diff across all commits in this push / rebase batch
let diffFiles = [];
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
const isZeroSha = !previousSha || /^0+$/.test(previousSha);

try {
  let diffCommand = "";

  // Check if HEAD is a merge commit
  let isMergeCommit = false;
  try {
    execSync("git rev-parse --verify HEAD^2", { stdio: "ignore" });
    isMergeCommit = true;
  } catch {
    isMergeCommit = false;
  }

  if (isMergeCommit) {
    console.log("[ignore-build] Merge commit detected. Comparing HEAD^1 to HEAD.");
    diffCommand = "git diff HEAD^1 HEAD --name-only";
  } else if (!isZeroSha && previousSha !== commitSha) {
    console.log(`[ignore-build] Rebase / batch push detected. Comparing ${previousSha.slice(0, 7)} to ${commitSha.slice(0, 7)}.`);
    try {
      // Verify previousSha exists in local clone; fetch if shallow clone lacks it
      execSync(`git rev-parse --verify "${previousSha}"`, { stdio: "ignore" });
    } catch {
      console.log(`[ignore-build] Previous commit ${previousSha.slice(0, 7)} not found in local shallow clone. Fetching history...`);
      try {
        execSync(`git fetch origin ${previousSha} --depth=50`, { stdio: "ignore" });
      } catch {
        console.log("[ignore-build] Shallow history fetch failed. Proceeding with build as safe fallback.");
        process.exit(1);
      }
    }
    diffCommand = `git diff ${previousSha} HEAD --name-only`;
  } else {
    console.log("[ignore-build] Single commit detected. Comparing HEAD~1 to HEAD.");
    diffCommand = "git diff HEAD~1 HEAD --name-only";
  }

  const output = execSync(diffCommand, { encoding: "utf8" });
  diffFiles = output.split("\n").map((f) => f.trim()).filter(Boolean);
  console.log(`[ignore-build] Evaluated ${diffFiles.length} changed file(s) across this push batch.`);
} catch (err) {
  // If diff fails (e.g. initial clone or shallow history), allow build to be safe
  console.log(`[ignore-build] Unable to compute git diff (${err.message}). Proceeding with build as safe fallback.`);
  process.exit(1);
}

// 4. Shared decision logic (also used by the GitHub Actions deploy workflow)
const decision = shouldDeployApp(targetApp, diffFiles);
console.log(`[ignore-build] ${decision.reason} ${decision.build ? "Proceeding with build." : "Skipping build."}`);
process.exit(decision.build ? 1 : 0);
