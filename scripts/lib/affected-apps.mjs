// Single source of truth for "does this app need a new production deploy?"
// Used by scripts/ignore-build-step.mjs (Vercel) and scripts/detect-changed-apps.mjs (GitHub Actions).

export const DEPLOYABLE_APPS = [
  "main-portal",
  "cms-studio",
  "ai-ml-portal",
  "ar-vr-portal",
  "cp-portal",
  "cybersecurity-portal",
  "design-portal",
  "full-stack-portal",
  "oss-portal",
  "ssnhacks-portal",
];

export const VERTICAL_PORTAL_MAP = {
  "ai-ml-portal": "ai-ml",
  "ar-vr-portal": "ar-vr-game-dev",
  "cp-portal": "competitive-programming",
  "cybersecurity-portal": "cybersecurity",
  "design-portal": "design-ui-ux",
  "full-stack-portal": "full-stack",
  "oss-portal": "open-source",
  "ssnhacks-portal": "ssnhacks",
};

// Files that never affect any deployed app.
// Content markdown (content/**) is deliberately NOT here: posts are the database.
const GLOBAL_IGNORE_PATTERNS = [
  /^(README|CLAUDE|AGENTS)\.md$/i,
  /^apps\/[^/]+\/README\.md$/i,
  /^docs\//,
  /^\.githooks\//,
  /^\.github\//,
  /^scripts\//,
  /^\.env\.example$/,
  /^commit-guard\.ps1$/,
  /^\.gitignore$/,
];

// Files that affect every app.
const ROOT_CONFIGS = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json"];

/**
 * @param {string} app  app directory name under apps/
 * @param {string[]} changedFiles  repo-relative paths
 * @returns {{ build: boolean, reason: string }}
 */
export function shouldDeployApp(app, changedFiles) {
  const relevant = changedFiles.filter((f) => !GLOBAL_IGNORE_PATTERNS.some((p) => p.test(f)));

  if (relevant.length === 0) {
    return { build: false, reason: "Only documentation, CI workflows, or non-app scripts changed." };
  }

  if (relevant.some((f) => ROOT_CONFIGS.includes(f) || f.startsWith("packages/"))) {
    return { build: true, reason: "Shared packages or root dependency configuration changed." };
  }

  const ownApp = (f) => f.startsWith(`apps/${app}/`);

  if (app === "main-portal") {
    // Hub aggregates all vertical articles and club announcements.
    const hit = relevant.some((f) => ownApp(f) || f.startsWith("content/"));
    return hit
      ? { build: true, reason: "Changes in apps/main-portal or content/." }
      : { build: false, reason: "No relevant changes for main-portal." };
  }

  if (app === "cms-studio") {
    // Roles are read live from GitHub at request time, so content changes do not need a redeploy.
    return relevant.some(ownApp)
      ? { build: true, reason: "Changes in apps/cms-studio/." }
      : { build: false, reason: "No relevant changes for cms-studio." };
  }

  if (app in VERTICAL_PORTAL_MAP) {
    const slug = VERTICAL_PORTAL_MAP[app];
    const hit = relevant.some((f) => ownApp(f) || f.startsWith(`content/verticals/${slug}/`));
    return hit
      ? { build: true, reason: `Changes in apps/${app} or content/verticals/${slug}/.` }
      : { build: false, reason: `No relevant changes for ${app}.` };
  }

  return { build: true, reason: `Unrecognized app '${app}'. Building as a safe fallback.` };
}
