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
}

const ROLES_FILE_PATH = path.resolve(process.cwd(), "../../content/club/roles.json");
const ALT_ROLES_FILE_PATH = path.resolve(process.cwd(), "content/club/roles.json");
const CODEOWNERS_PATH = path.resolve(process.cwd(), "../../.github/CODEOWNERS");
const ALT_CODEOWNERS_PATH = path.resolve(process.cwd(), ".github/CODEOWNERS");

const ALL_VERTICAL_SLUGS = [
  "ai-ml",
  "ar-vr-game-dev",
  "competitive-programming",
  "cybersecurity",
  "ssnhacks",
  "design-ui-ux",
  "full-stack",
  "open-source",
];

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

export function readRoles(): ClubRoles {
  const initVerticalMap = () =>
    ALL_VERTICAL_SLUGS.reduce((acc, v) => ({ ...acc, [v]: [] }), {} as Record<string, string[]>);

  try {
    const filePath = getRolesFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return {
        superadmins: parsed.superadmins || ["blackscythe123"],
        vertical_heads: { ...initVerticalMap(), ...(parsed.vertical_heads || {}) },
        deputies: { ...initVerticalMap(), ...(parsed.deputies || {}) },
        members: { ...initVerticalMap(), ...(parsed.members || {}) },
        pending_requests: parsed.pending_requests || [],
      };
    }
  } catch (err) {
    console.error("Error reading roles.json:", err);
  }

  // Fallback defaults
  return {
    superadmins: ["blackscythe123"],
    vertical_heads: { ...initVerticalMap(), "ai-ml": ["blackscythe123"] },
    deputies: initVerticalMap(),
    members: initVerticalMap(),
    pending_requests: [],
  };
}

export function getUserRoleInfo(username: string): UserRoleInfo {
  const normalized = username.toLowerCase().trim();
  const roles = readRoles();

  // Tier 1: Superadmin (Controls all)
  const isSuperadmin = roles.superadmins.some((u) => u.toLowerCase() === normalized);
  if (isSuperadmin) {
    return {
      username,
      role: "superadmin",
      verticals: [
        "club",
        ...ALL_VERTICAL_SLUGS,
      ],
    };
  }

  // Tier 2: Vertical Head (Admin for that vertical - strictly 1 per vertical)
  const headVerticals: string[] = [];
  for (const [vertical, heads] of Object.entries(roles.vertical_heads || {})) {
    if (Array.isArray(heads) && heads.some((u) => u.toLowerCase() === normalized)) {
      headVerticals.push(vertical);
    }
  }

  if (headVerticals.length > 0) {
    return {
      username,
      role: "vertical_head",
      verticals: headVerticals,
    };
  }

  // Tier 3: Deputy (Co-lead / Reviewer for that vertical)
  const deputyVerticals: string[] = [];
  for (const [vertical, deps] of Object.entries(roles.deputies || {})) {
    if (Array.isArray(deps) && deps.some((u) => u.toLowerCase() === normalized)) {
      deputyVerticals.push(vertical);
    }
  }

  if (deputyVerticals.length > 0) {
    return {
      username,
      role: "deputy",
      verticals: deputyVerticals,
    };
  }

  // Tier 4: Member (Assigned to specific vertical(s))
  const memberVerticals: string[] = [];
  for (const [vertical, mems] of Object.entries(roles.members || {})) {
    if (Array.isArray(mems) && mems.some((u) => u.toLowerCase() === normalized)) {
      memberVerticals.push(vertical);
    }
  }

  return {
    username,
    role: "member",
    verticals: memberVerticals,
  };
}

export function canUserApproveVertical(username: string, vertical: string): boolean {
  const info = getUserRoleInfo(username);
  if (info.role === "superadmin") return true;
  if (
    (info.role === "vertical_head" || info.role === "deputy") &&
    info.verticals.includes(vertical)
  ) {
    return true;
  }
  return false;
}

export function canDeletePost(username: string, vertical: string): boolean {
  const info = getUserRoleInfo(username);
  if (info.role === "superadmin") return true;
  if (info.role === "vertical_head" && info.verticals.includes(vertical)) return true;
  return false;
}

export function canApproveRoleRequest(
  reviewerUsername: string,
  requestedRole: "member" | "deputy" | "vertical_head",
  vertical: string
): boolean {
  const info = getUserRoleInfo(reviewerUsername);
  if (info.role === "superadmin") return true;

  if (requestedRole === "vertical_head") {
    // Only Super Admin can approve a Vertical Head
    return false;
  }

  if (requestedRole === "deputy") {
    // Vertical Head of that vertical or Super Admin
    return info.role === "vertical_head" && info.verticals.includes(vertical);
  }

  if (requestedRole === "member") {
    // Deputy of that vertical, Vertical Head of that vertical, or Super Admin
    return (
      (info.role === "vertical_head" || info.role === "deputy") &&
      info.verticals.includes(vertical)
    );
  }

  return false;
}

export function assignRole(
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
  githubToken?: string
): Promise<void> {
  const rolesJsonContent = JSON.stringify(roles, null, 2);

  // Generate .github/CODEOWNERS
  const superowner = roles.superadmins[0] ? `@${roles.superadmins[0]}` : "@blackscythe123";
  let codeownersContent = `# SSN Coding Club CMS - Code Owners & Editorial Approval Mapping\n# Auto-generated from content/club/roles.json\n\n`;
  codeownersContent += `* ${superowner}\n\n`;
  codeownersContent += `# Announcements & Club Core\ncontent/club/** ${superowner}\n\n`;

  for (const vertical of ALL_VERTICAL_SLUGS) {
    const heads = roles.vertical_heads[vertical] || [];
    const deps = roles.deputies[vertical] || [];
    const allApprovers = [...heads, ...deps];
    const reviewers = allApprovers.length > 0 ? allApprovers.map((h) => `@${h}`).join(" ") : superowner;
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

  // 2. If GitHub token is present, commit to GitHub directly (Serverless/Vercel Safe)
  if (githubToken) {
    try {
      const octokit = new Octokit({ auth: githubToken });
      const owner = "blackscythe123";
      const repo = "CC-Website-2026";

      // Commit roles.json
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
        message: "chore(governance): update roles hierarchy",
        content: Buffer.from(rolesJsonContent, "utf-8").toString("base64"),
        sha: rolesSha,
        branch: "main",
      });

      // Commit .github/CODEOWNERS
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
      });
    } catch (gitErr) {
      console.error("Error committing roles update to GitHub:", gitErr);
      throw gitErr;
    }
  }
}
