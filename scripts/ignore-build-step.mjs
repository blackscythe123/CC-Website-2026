import { execSync } from "node:child_process";

// 1. Strictly enforce: ONLY 'main' branch builds on Vercel
const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
if (branch && branch !== "main") {
  console.log(`[ignore-build] Branch '${branch}' is not 'main'. Skipping preview deployment.`);
  process.exit(0);
}

// 2. Extract target app from CLI arguments (e.g. node scripts/ignore-build-step.mjs main-portal)
const targetApp = process.argv[2] || "main-portal";

// 3. Inspect git diff between HEAD and previous commit
let diffFiles = [];
try {
  const output = execSync("git diff HEAD~1 HEAD --name-only", { encoding: "utf8" });
  diffFiles = output.split("\n").map((f) => f.trim()).filter(Boolean);
} catch {
  // If diff fails (e.g. initial clone or shallow history), allow build to be safe
  console.log("[ignore-build] Unable to compute git diff. Proceeding with build.");
  process.exit(1);
}

// 4. Global ignore patterns (never trigger ANY vercel build)
const globalIgnorePatterns = [
  /\.md$/i,
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
  console.log("[ignore-build] Only documentation, CI, or non-app scripts changed. Skipping build.");
  process.exit(0);
}

// 5. App-specific triggers
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

if (targetApp === "main-portal") {
  // main-portal cares about apps/main-portal and content/
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

if (targetApp === "cms-studio") {
  // cms-studio only cares about apps/cms-studio/
  const hasAppChange = relevantDiff.some((f) => f.startsWith("apps/cms-studio/"));

  if (hasAppChange) {
    console.log("[ignore-build] Changes detected in apps/cms-studio/. Proceeding with build.");
    process.exit(1);
  } else {
    console.log("[ignore-build] No relevant changes for cms-studio. Skipping build.");
    process.exit(0);
  }
}

// Fallback: Proceed with build for other apps
process.exit(1);
