import { execSync } from "node:child_process";
import path from "node:path";

// 1. Strictly enforce: ONLY 'main' branch builds on Vercel (skip all draft/PR previews)
const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
if (branch && branch !== "main") {
  console.log(`[ignore-build] Branch '${branch}' is not 'main'. Skipping preview deployment.`);
  process.exit(0);
}

// 2. Map of 8 technical vertical portals to their content vertical slugs
const VERTICAL_PORTAL_MAP = {
  "ai-ml-portal": "ai-ml",
  "ar-vr-portal": "ar-vr-game-dev",
  "cp-portal": "competitive-programming",
  "cybersecurity-portal": "cybersecurity",
  "design-portal": "design-ui-ux",
  "full-stack-portal": "full-stack",
  "oss-portal": "open-source",
  "ssnhacks-portal": "ssnhacks",
};

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

// 4. Global ignore patterns (never trigger ANY vercel build)
// NOTE: Content markdown (content/**) is deliberately EXCLUDED here because posts are the database!
const globalIgnorePatterns = [
  /^(README|CLAUDE|AGENTS)\.md$/i,
  /^apps\/[^\/]+\/README\.md$/i,
  /^\.githooks\//,
  /^\.github\//,
  /^scripts\//,
  /^\.env\.example$/,
  /^commit-guard\.ps1$/,
  /^\.gitignore$/,
];

const relevantDiff = diffFiles.filter(
  (file) => !globalIgnorePatterns.some((pattern) => pattern.test(file))
);

if (relevantDiff.length === 0) {
  console.log("[ignore-build] Only documentation, CI workflows, or non-app scripts changed. Skipping build.");
  process.exit(0);
}

// 5. Shared triggers that require building EVERY app
const rootConfigs = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
];

const hasRootConfigChange = relevantDiff.some((f) => rootConfigs.includes(f));
const hasSharedPackageChange = relevantDiff.some((f) => f.startsWith("packages/"));

if (hasRootConfigChange || hasSharedPackageChange) {
  console.log("[ignore-build] Shared packages or root dependency configurations changed. Proceeding with build.");
  process.exit(1);
}

// 6. Main Portal (Hub)
if (targetApp === "main-portal") {
  // main-portal aggregates all vertical articles, club announcements, and its own frontend
  const hasAppChange = relevantDiff.some(
    (f) => f.startsWith("apps/main-portal/") || f.startsWith("content/")
  );

  if (hasAppChange) {
    console.log("[ignore-build] Changes detected in apps/main-portal or content/. Proceeding with build.");
    process.exit(1);
  } else {
    console.log("[ignore-build] No relevant changes for main-portal. Skipping build.");
    process.exit(0);
  }
}

// 7. CMS Studio (Admin app)
if (targetApp === "cms-studio") {
  // cms-studio is SSR/Client dynamic via GitHub API; it only rebuilds when its own app code changes
  const hasAppChange = relevantDiff.some((f) => f.startsWith("apps/cms-studio/"));

  if (hasAppChange) {
    console.log("[ignore-build] Changes detected in apps/cms-studio/. Proceeding with build.");
    process.exit(1);
  } else {
    console.log("[ignore-build] No relevant changes for cms-studio. Skipping build.");
    process.exit(0);
  }
}

// 8. Individual Technical Vertical Portals
if (targetApp in VERTICAL_PORTAL_MAP) {
  const verticalSlug = VERTICAL_PORTAL_MAP[targetApp];
  const hasAppChange = relevantDiff.some(
    (f) =>
      f.startsWith(`apps/${targetApp}/`) ||
      f.startsWith(`content/verticals/${verticalSlug}/`)
  );

  if (hasAppChange) {
    console.log(`[ignore-build] Changes detected in apps/${targetApp} or content/verticals/${verticalSlug}/. Proceeding with build.`);
    process.exit(1);
  } else {
    console.log(`[ignore-build] No relevant changes for ${targetApp}. Skipping build.`);
    process.exit(0);
  }
}

// Fallback: Proceed with build for any unmapped app to prevent silent omissions
console.log(`[ignore-build] Unrecognized app '${targetApp}'. Proceeding with build as fallback.`);
process.exit(1);
