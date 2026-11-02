import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

export interface RoleRequest {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  requestedRole: "member" | "deputy" | "vertical_head";
  vertical: string;
  note?: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
}

export interface ClubRoles {
  superadmins: string[];
  vertical_heads: Record<string, string[]>;
  deputies: Record<string, string[]>;
  members: Record<string, string[]>;
  pending_requests?: RoleRequest[];
}

export type UserRoleType = "superadmin" | "vertical_head" | "deputy" | "member";

export interface UserRoleInfo {
  username: string;
  role: UserRoleType;
  verticals: string[];
  rolesByVertical?: Record<string, UserRoleType>;
}

const ROLES_FILE_PATH = path.resolve(process.cwd(), "../../content/club/roles.json");
const ALT_ROLES_FILE_PATH = path.resolve(process.cwd(), "content/club/roles.json");
const CODEOWNERS_PATH = path.resolve(process.cwd(), "../../.github/CODEOWNERS");
const ALT_CODEOWNERS_PATH = path.resolve(process.cwd(), ".github/CODEOWNERS");

export const ALL_VERTICAL_SLUGS = [
  "ai-ml",
  "ar-vr-game-dev",
  "competitive-programming",
  "cybersecurity",
  "ssnhacks",
  "design-ui-ux",
  "full-stack",
  "open-source",
];

export const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function getRolesFilePath(): string {
  if (fs.existsSync(ROLES_FILE_PATH)) return ROLES_FILE_PATH;
  if (fs.existsSync(ALT_ROLES_FILE_PATH)) return ALT_ROLES_FILE_PATH;
  return ROLES_FILE_PATH;
}

function getCodeownersPath(): string {
  if (fs.existsSync(CODEOWNERS_PATH)) return CODEOWNERS_PATH;
  if (fs.existsSync(ALT_CODEOWNERS_PATH)) return ALT_CODEOWNERS_PATH;
  return CODEOWNERS_PATH;
}

let inMemoryRoles: ClubRoles | null = null;
let lastRolesFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5-second short cache to prevent GitHub rate limits while staying real-time

export function getCachedRoles(): ClubRoles | null {
  return inMemoryRoles;
}

export function setCachedRoles(roles: ClubRoles) {
  inMemoryRoles = roles;
  lastRolesFetchTime = Date.now();
}

export function normalizeClubRoles(raw: any): ClubRoles {
  const initVerticalMap = () =>
    ALL_VERTICAL_SLUGS.reduce((acc, v) => ({ ...acc, [v]: [] }), {} as Record<string, string[]>);

  return {
    superadmins: Array.isArray(raw?.superadmins) ? raw.superadmins : ["blackscythe123"],
    vertical_heads: { ...initVerticalMap(), ...(raw?.vertical_heads || {}) },
    deputies: { ...initVerticalMap(), ...(raw?.deputies || {}) },
    members: { ...initVerticalMap(), ...(raw?.members || {}) },
    pending_requests: Array.isArray(raw?.pending_requests) ? raw.pending_requests : [],
  };
}

export async function getLiveClubRoles(forceFresh = false): Promise<ClubRoles> {
  const now = Date.now();
  if (!forceFresh && inMemoryRoles && now - lastRolesFetchTime < CACHE_TTL_MS) {
    return inMemoryRoles;
  }

  // 1. Live read through the GitHub Contents API. Unlike raw.githubusercontent.com (CDN-cached
  //    for ~5 minutes), this returns the current file on main, so role removals apply immediately.
  //    Uses the server PAT when configured; otherwise an unauthenticated call (60 requests/hour per IP).
  const contentsUrl =
    "https://api.github.com/repos/blackscythe123/CC-Website-2026/contents/content/club/roles.json?ref=main";
  const pat = process.env.GITHUB_ADMIN_TOKEN || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
  const apiAttempts: Record<string, string>[] = [];
  if (pat) apiAttempts.push({ Authorization: `Bearer ${pat}` });
  apiAttempts.push({});

  for (const authHeader of apiAttempts) {
    try {
      const res = await fetch(contentsUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github.raw+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "coding-club-cms-studio",
          ...authHeader,
        },
      });
      if (res.ok) {
        const normalized = normalizeClubRoles(await res.json());
        setCachedRoles(normalized);
        return normalized;
      }
      console.warn(`GitHub Contents API roles fetch failed (${res.status})${authHeader.Authorization ? " with PAT" : ""}.`);
    } catch (apiErr) {
      console.warn("GitHub Contents API roles fetch errored:", apiErr);
    }
  }

  // 2. Last-resort network fallback: raw CDN copy (may lag main by a few minutes).
  try {
    const rawRes = await fetch(
      "https://raw.githubusercontent.com/blackscythe123/CC-Website-2026/main/content/club/roles.json",
      { cache: "no-store", headers: { "User-Agent": "coding-club-cms-studio" } }
    );
    if (rawRes.ok) {
      const normalized = normalizeClubRoles(await rawRes.json());
      setCachedRoles(normalized);
      return normalized;
    }
  } catch (rawErr) {
    console.warn("Raw GitHub roles fetch failed:", rawErr);
  }

  // Fallback to local file read
  const diskRoles = readRoles();
  setCachedRoles(diskRoles);
  return diskRoles;
}

export function readRoles(): ClubRoles {
  if (inMemoryRoles) {
    return inMemoryRoles;
  }

  try {
    const filePath = getRolesFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      const normalized = normalizeClubRoles(parsed);
      inMemoryRoles = normalized;
      lastRolesFetchTime = Date.now();
      return normalized;
    }
  } catch (err) {
    console.error("Error reading roles.json from disk:", err);
  }

  // Fallback defaults
  return normalizeClubRoles({});
}

export function getUserRoleInfo(username: string, rolesOverride?: ClubRoles): UserRoleInfo {
  const normalized = username.toLowerCase().trim();
  const roles = rolesOverride || readRoles();

  // Tier 1: Superadmin (Controls all)
  const isSuperadmin = roles.superadmins.some((u) => u.toLowerCase() === normalized);
  if (isSuperadmin) {
    const rolesByVertical: Record<string, UserRoleType> = {};
    ALL_VERTICAL_SLUGS.forEach((v) => {
      rolesByVertical[v] = "superadmin";
    });
    return {
      username,
      role: "superadmin",
      verticals: [
        "club",
        ...ALL_VERTICAL_SLUGS,
      ],
      rolesByVertical,
    };
  }

  // Cross-vertical role mapping
  const rolesByVertical: Record<string, UserRoleType> = {};
  const allVerticalsSet = new Set<string>();

  for (const [vertical, heads] of Object.entries(roles.vertical_heads || {})) {
    if (Array.isArray(heads) && heads.some((u) => u.toLowerCase() === normalized)) {
      rolesByVertical[vertical] = "vertical_head";
      allVerticalsSet.add(vertical);
    }
  }

  for (const [vertical, deps] of Object.entries(roles.deputies || {})) {
    if (Array.isArray(deps) && deps.some((u) => u.toLowerCase() === normalized)) {
      if (!rolesByVertical[vertical]) {
        rolesByVertical[vertical] = "deputy";
      }
      allVerticalsSet.add(vertical);
    }
  }

  for (const [vertical, mems] of Object.entries(roles.members || {})) {
    if (Array.isArray(mems) && mems.some((u) => u.toLowerCase() === normalized)) {
      if (!rolesByVertical[vertical]) {
        rolesByVertical[vertical] = "member";
      }
      allVerticalsSet.add(vertical);
    }
  }

  const assignedVerticals = Array.from(allVerticalsSet);
  const rolesList = Object.values(rolesByVertical);

  let primaryRole: UserRoleType = "member";
  if (rolesList.includes("vertical_head")) {
    primaryRole = "vertical_head";
  } else if (rolesList.includes("deputy")) {
    primaryRole = "deputy";
  } else {
    primaryRole = "member";
  }

  return {
    username,
    role: primaryRole,
    verticals: assignedVerticals,
    rolesByVertical,
  };
}

export async function getLiveUserRoleInfo(
  username: string,
  forceFresh = false
): Promise<UserRoleInfo> {
  const roles = await getLiveClubRoles(forceFresh);
  return getUserRoleInfo(username, roles);
}

export function canUserApproveVertical(
  username: string,
  vertical: string,
  rolesOverride?: ClubRoles
): boolean {
  const roles = rolesOverride || readRoles();
  const normalized = username.toLowerCase().trim();
  if (roles.superadmins.some((u) => u.toLowerCase() === normalized)) return true;

  const isHead = roles.vertical_heads[vertical]?.some((u) => u.toLowerCase() === normalized);
  const isDep = roles.deputies[vertical]?.some((u) => u.toLowerCase() === normalized);
  return Boolean(isHead || isDep);
}

export function canDeletePost(
  username: string,
  vertical: string,
  rolesOverride?: ClubRoles
): boolean {
  const roles = rolesOverride || readRoles();
  const normalized = username.toLowerCase().trim();
  if (roles.superadmins.some((u) => u.toLowerCase() === normalized)) return true;

  const isHead = roles.vertical_heads[vertical]?.some((u) => u.toLowerCase() === normalized);
  return Boolean(isHead);
}

export function canApproveRoleRequest(
  reviewerUsername: string,
  requestedRole: "member" | "deputy" | "vertical_head",
  vertical: string,
  rolesOverride?: ClubRoles
): boolean {
  const roles = rolesOverride || readRoles();
  const normalized = reviewerUsername.toLowerCase().trim();
  if (roles.superadmins.some((u) => u.toLowerCase() === normalized)) return true;

  if (requestedRole === "vertical_head") {
    // Only Super Admin can approve a Vertical Head
    return false;
  }

  const isHead = roles.vertical_heads[vertical]?.some((u) => u.toLowerCase() === normalized);
  const isDep = roles.deputies[vertical]?.some((u) => u.toLowerCase() === normalized);

  if (requestedRole === "deputy") {
    // Vertical Head of that vertical or Super Admin
    return Boolean(isHead);
  }

  if (requestedRole === "member") {
    // Deputy or Vertical Head of that vertical, or Super Admin
    return Boolean(isHead || isDep);
  }

  return false;
}

const ROLE_RANK: Record<string, number> = { member: 1, deputy: 2, vertical_head: 3, superadmin: 4 };

function rankIn(info: UserRoleInfo, vertical?: string): number {
  if (info.role === "superadmin") return ROLE_RANK.superadmin;
  if (!vertical) return 0;
  return ROLE_RANK[info.rolesByVertical?.[vertical] || ""] || 0;
}

/**
 * Server-side governance for assigning/removing roles. Returns an error message, or null if allowed.
 * Authority is evaluated per vertical (never from the actor's highest role elsewhere), and a
 * non-superadmin can only act on users ranked strictly below them in that vertical.
 */
export function checkRoleChangeAllowed(
  roles: ClubRoles,
  actorUsername: string,
  targetUsername: string,
  action: "assign" | "remove",
  role: UserRoleType,
  vertical?: string
): string | null {
  const actor = getUserRoleInfo(actorUsername, roles);
  const target = getUserRoleInfo(targetUsername, roles);
  const actorIsSuper = actor.role === "superadmin";

  if (role === "superadmin" || role === "vertical_head") {
    if (!actorIsSuper) {
      return role === "superadmin"
        ? "Only existing Superadmins can allocate the Super Admin role."
        : "Only Superadmins can appoint or remove a Vertical Head.";
    }
  } else {
    const required = role === "deputy" ? ROLE_RANK.vertical_head : ROLE_RANK.deputy;
    if (rankIn(actor, vertical) < required) {
      return role === "deputy"
        ? `Only the Vertical Head of '${vertical}' or a Superadmin can manage Deputies there.`
        : `Only Deputies or the Vertical Head of '${vertical}', or a Superadmin, can manage members there.`;
    }
  }

  if (!actorIsSuper) {
    const targetRank = target.role === "superadmin" ? ROLE_RANK.superadmin : rankIn(target, vertical);
    if (targetRank >= rankIn(actor, vertical)) {
      return "You cannot change the role of someone at or above your own rank in this vertical.";
    }
  }

  if (role === "superadmin" && action === "remove") {
    const remaining = roles.superadmins.filter(
      (u) => u.toLowerCase() !== targetUsername.toLowerCase().trim().replace(/^@/, "")
    );
    if (remaining.length === 0) return "Cannot remove the last Superadmin.";
  }

  return null;
}

export function assignRole(
  roles: ClubRoles,
  targetUsername: string,
  role: UserRoleType,
  vertical?: string
): ClubRoles {
  const cleanUser = targetUsername.toLowerCase().trim().replace(/^@/, "");
  if (!GITHUB_USERNAME_REGEX.test(cleanUser)) {
    throw new Error(`Invalid GitHub username '${cleanUser}'. Traversal or special characters are strictly forbidden.`);
  }
  const updated: ClubRoles = {
    superadmins: [...(roles.superadmins || [])],
    vertical_heads: { ...(roles.vertical_heads || {}) },
    deputies: { ...(roles.deputies || {}) },
    members: { ...(roles.members || {}) },
    pending_requests: [...(roles.pending_requests || [])],
  };

  if (role === "superadmin") {
    if (!updated.superadmins.some((u) => u.toLowerCase() === cleanUser)) {
      updated.superadmins.push(cleanUser);
    }
    return updated;
  }

  if (!vertical) return updated;

  // Enforce: STRICTLY ONE HEAD PER VERTICAL
  if (role === "vertical_head") {
    updated.vertical_heads[vertical] = [cleanUser];
    if (updated.deputies[vertical]) {
      updated.deputies[vertical] = updated.deputies[vertical].filter(
        (u) => u.toLowerCase() !== cleanUser
      );
    }
    if (updated.members[vertical]) {
      updated.members[vertical] = updated.members[vertical].filter(
        (u) => u.toLowerCase() !== cleanUser
      );
    }
    return updated;
  }

  if (role === "deputy") {
    // Purge head or member in this vertical on promotion/demotion
    if (updated.vertical_heads[vertical]) {
      updated.vertical_heads[vertical] = updated.vertical_heads[vertical].filter(
        (u) => u.toLowerCase() !== cleanUser
      );
    }
    if (!updated.deputies[vertical]) updated.deputies[vertical] = [];
    if (!updated.deputies[vertical].some((u) => u.toLowerCase() === cleanUser)) {
      updated.deputies[vertical].push(cleanUser);
    }
    if (updated.members[vertical]) {
      updated.members[vertical] = updated.members[vertical].filter(
        (u) => u.toLowerCase() !== cleanUser
      );
    }
    return updated;
  }

  if (role === "member") {
    // Purge head or deputy in this vertical on demotion
    if (updated.vertical_heads[vertical]) {
      updated.vertical_heads[vertical] = updated.vertical_heads[vertical].filter(
        (u) => u.toLowerCase() !== cleanUser
      );
    }
    if (updated.deputies[vertical]) {
      updated.deputies[vertical] = updated.deputies[vertical].filter(
        (u) => u.toLowerCase() !== cleanUser
      );
    }
    if (!updated.members[vertical]) updated.members[vertical] = [];
    if (!updated.members[vertical].some((u) => u.toLowerCase() === cleanUser)) {
      updated.members[vertical].push(cleanUser);
    }
    return updated;
  }

  return updated;
}

export function removeRole(
  roles: ClubRoles,
  targetUsername: string,
  role: UserRoleType,
  vertical?: string
): ClubRoles {
  const cleanUser = targetUsername.toLowerCase().trim().replace(/^@/, "");
  const updated: ClubRoles = {
    superadmins: [...(roles.superadmins || [])],
    vertical_heads: { ...(roles.vertical_heads || {}) },
    deputies: { ...(roles.deputies || {}) },
    members: { ...(roles.members || {}) },
    pending_requests: [...(roles.pending_requests || [])],
  };

  if (role === "superadmin") {
    updated.superadmins = updated.superadmins.filter(
      (u) => u.toLowerCase() !== cleanUser
    );
    return updated;
  }

  if (!vertical) return updated;

  if (role === "vertical_head" && updated.vertical_heads[vertical]) {
    updated.vertical_heads[vertical] = updated.vertical_heads[vertical].filter(
      (u) => u.toLowerCase() !== cleanUser
    );
  }

  if (role === "deputy" && updated.deputies[vertical]) {
    updated.deputies[vertical] = updated.deputies[vertical].filter(
      (u) => u.toLowerCase() !== cleanUser
    );
  }

  if (role === "member" && updated.members[vertical]) {
    updated.members[vertical] = updated.members[vertical].filter(
      (u) => u.toLowerCase() !== cleanUser
    );
  }

  return updated;
}

export async function writeRolesAndSyncCodeowners(
  roles: ClubRoles,
  githubToken?: string,
  authorAttestation?: { name: string; email: string; message?: string }
): Promise<void> {
  const rolesJsonContent = JSON.stringify(roles, null, 2);

  // Generate .github/CODEOWNERS (include all superadmins)
  const allSuperowners =
    roles.superadmins.length > 0
      ? roles.superadmins.map((s) => `@${s}`).join(" ")
      : "@blackscythe123";
  let codeownersContent = `# SSN Coding Club CMS - Code Owners & Editorial Approval Mapping\n# Auto-generated from content/club/roles.json\n\n`;
  codeownersContent += `* ${allSuperowners}\n\n`;
  codeownersContent += `# Announcements & Club Core\ncontent/club/** ${allSuperowners}\n\n`;

  for (const vertical of ALL_VERTICAL_SLUGS) {
    const heads = roles.vertical_heads[vertical] || [];
    const deps = roles.deputies[vertical] || [];
    const allApprovers = [...heads, ...deps];
    const reviewers =
      allApprovers.length > 0
        ? allApprovers.map((h) => `@${h}`).join(" ")
        : allSuperowners;
    codeownersContent += `content/verticals/${vertical}/** ${reviewers}\n`;
  }

  // 1. Try local write if filesystem is writable
  try {
    const rolesPath = getRolesFilePath();
    const dir = path.dirname(rolesPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(rolesPath, rolesJsonContent, "utf-8");

    const codeownersPath = getCodeownersPath();
    const cDir = path.dirname(codeownersPath);
    if (!fs.existsSync(cDir)) fs.mkdirSync(cDir, { recursive: true });
    fs.writeFileSync(codeownersPath, codeownersContent, "utf-8");
  } catch (err) {
    console.warn("Local file write skipped (read-only environment):", err);
  }

  // 2. Commit to GitHub directly using admin token or reviewer session token
  const activeToken = process.env.GITHUB_ADMIN_TOKEN || githubToken;
  if (activeToken) {
    try {
      const octokit = new Octokit({ auth: activeToken });
      const owner = "blackscythe123";
      const repo = "CC-Website-2026";

      const commitAuthor = authorAttestation
        ? { name: authorAttestation.name, email: authorAttestation.email }
        : undefined;

      const commitMessage = authorAttestation?.message || "chore(governance): update roles hierarchy";

      try {
        // Atomic commit via Git Data API (Tree + Commit) so roles.json and CODEOWNERS are updated simultaneously in 1 commit
        const { data: refData } = await octokit.git.getRef({
          owner,
          repo,
          ref: "heads/main",
        });
        const latestCommitSha = refData.object.sha;

        const { data: commitData } = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: latestCommitSha,
        });
        const baseTreeSha = commitData.tree.sha;

        const { data: newTree } = await octokit.git.createTree({
          owner,
          repo,
          base_tree: baseTreeSha,
          tree: [
            {
              path: "content/club/roles.json",
              mode: "100644",
              type: "blob",
              content: rolesJsonContent,
            },
            {
              path: ".github/CODEOWNERS",
              mode: "100644",
              type: "blob",
              content: codeownersContent,
            },
          ],
        });

        const { data: newCommit } = await octokit.git.createCommit({
          owner,
          repo,
          message: commitMessage,
          tree: newTree.sha,
          parents: [latestCommitSha],
          ...(commitAuthor ? { author: commitAuthor } : {}),
        });

        await octokit.git.updateRef({
          owner,
          repo,
          ref: "heads/main",
          sha: newCommit.sha,
        });
      } catch (atomicErr) {
        console.warn("Atomic Git Tree commit failed, falling back to sequential createOrUpdateFileContents:", atomicErr);
        // Fallback to sequential commits if Git Tree API encounters an error
        let rolesSha: string | undefined;
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: "content/club/roles.json",
          });
          if (!Array.isArray(data) && data.sha) rolesSha = data.sha;
        } catch {
          // file doesn't exist yet
        }

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: "content/club/roles.json",
          message: commitMessage,
          content: Buffer.from(rolesJsonContent, "utf-8").toString("base64"),
          sha: rolesSha,
          branch: "main",
          ...(commitAuthor ? { author: commitAuthor } : {}),
        });

        let codeownersSha: string | undefined;
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: ".github/CODEOWNERS",
          });
          if (!Array.isArray(data) && data.sha) codeownersSha = data.sha;
        } catch {
          // file doesn't exist yet
        }

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: ".github/CODEOWNERS",
          message: "chore(governance): update CODEOWNERS review mapping",
          content: Buffer.from(codeownersContent, "utf-8").toString("base64"),
          sha: codeownersSha,
          branch: "main",
          ...(commitAuthor ? { author: commitAuthor } : {}),
        });
      }
    } catch (gitErr) {
      console.error("Error committing roles update to GitHub:", gitErr);
      throw gitErr;
    }
  }

  // Only cache after the write succeeded, so a failed commit never grants uncommitted roles
  setCachedRoles(roles);
}
