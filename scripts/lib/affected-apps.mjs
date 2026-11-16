import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Single source of truth for "does this app need a new production deploy?"
// Used by scripts/detect-changed-apps.mjs (GitHub Actions CD).

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
  /^apps\/[^/]+\/(README|AGENTS|CLAUDE)\.md$/i,
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

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function workspaceDeps(pkg) {
  return Object.keys({
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
    ...(pkg?.peerDependencies ?? {}),
    ...(pkg?.optionalDependencies ?? {}),
  });
}

/**
 * Does a change in packages/<pkgDir> affect `app`?  Resolved from package.json files
 * (app -> package, and package -> package for transitive consumers).
 * Returns null when the package is unknown (caller must fall back to "everything").
 */
function packageAffectsApp(app, pkgDir, repoRoot) {
  const pkgJson = readJson(path.join(repoRoot, "packages", pkgDir, "package.json"));
  if (!pkgJson?.name) return null;

  // Names of every workspace package that (transitively) depends on pkgDir, plus pkgDir itself.
  const affectedNames = new Set([pkgJson.name]);
  const packagesDir = path.join(repoRoot, "packages");
  const others = fs.existsSync(packagesDir)
    ? fs.readdirSync(packagesDir).map((d) => readJson(path.join(packagesDir, d, "package.json"))).filter(Boolean)
    : [];
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of others) {
      if (p.name && !affectedNames.has(p.name) && workspaceDeps(p).some((d) => affectedNames.has(d))) {
        affectedNames.add(p.name);
        grew = true;
      }
    }
  }

  const appJson = readJson(path.join(repoRoot, "apps", app, "package.json"));
  if (!appJson) return null;
  return workspaceDeps(appJson).some((d) => affectedNames.has(d));
}

/**
 * @param {string} app  app directory name under apps/
 * @param {string[]} changedFiles  repo-relative paths
 * @returns {{ build: boolean, reason: string }}
 */
export function shouldDeployApp(app, changedFiles, { repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const relevant = changedFiles.filter((f) => !GLOBAL_IGNORE_PATTERNS.some((p) => p.test(f)));

  if (relevant.length === 0) {
    return { build: false, reason: "Only documentation, CI workflows, or non-app scripts changed." };
  }

  if (relevant.some((f) => ROOT_CONFIGS.includes(f))) {
    return { build: true, reason: "Root dependency configuration changed." };
  }

  // Shared packages: only apps that depend on the changed package (directly or transitively) redeploy.
  // An unknown/unreadable package, or a file directly under packages/, deploys everything.
  for (const f of relevant.filter((f) => f.startsWith("packages/"))) {
    const pkgDir = f.split("/")[1];
    const affects = f.split("/").length > 2 ? packageAffectsApp(app, pkgDir, repoRoot) : null;
    if (affects === null) {
      return { build: true, reason: `Unrecognized shared package path '${f}'. Building as a safe fallback.` };
    }
    if (affects) {
      return { build: true, reason: `Shared package packages/${pkgDir} (a dependency of ${app}) changed.` };
    }
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
    // portals.json feeds the portal's link back to the main portal (packages/scrapbook-ui/src/portals.ts);
    // comments.json switches reader comments on/off on every portal at build time.
    const hit = relevant.some(
      (f) =>
        ownApp(f) ||
        f.startsWith(`content/verticals/${slug}/`) ||
        f === "content/club/portals.json" ||
        f === "content/club/comments.json"
    );
    return hit
      ? { build: true, reason: `Changes in apps/${app} or content/verticals/${slug}/.` }
      : { build: false, reason: `No relevant changes for ${app}.` };
  }

  return { build: true, reason: `Unrecognized app '${app}'. Building as a safe fallback.` };
}
