import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

export interface ClubRoles {
  superadmins: string[];
  vertical_heads: Record<string, string[]>;
  deputies: Record<string, string[]>;
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
  try {
    const filePath = getRolesFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return {
        superadmins: parsed.superadmins || ["blackscythe123"],
        vertical_heads: parsed.vertical_heads || { "ai-ml": ["blackscythe123"] },
        deputies: parsed.deputies || {},
      };
    }
  } catch (err) {
    console.error("Error reading roles.json:", err);
  }

  // Fallback defaults
  return {
    superadmins: ["blackscythe123"],
    vertical_heads: {
      "ai-ml": ["blackscythe123"],
      "web-dev": [],
      "cybersecurity": [],
      "cloud-devops": [],
      "competitive-programming": [],
      "mobile-dev": [],
      "ui-ux": [],
      "blockchain": [],
      "iot-embedded": [],
      "game-dev": [],
    },
    deputies: {
      "ai-ml": [],
      "web-dev": [],
      "cybersecurity": [],
      "cloud-devops": [],
      "competitive-programming": [],
      "mobile-dev": [],
      "ui-ux": [],
      "blockchain": [],
      "iot-embedded": [],
      "game-dev": [],
    },
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
        "ai-ml",
        "web-dev",
        "cybersecurity",
        "cloud-devops",
        "competitive-programming",
        "mobile-dev",
        "ui-ux",
        "blockchain",
        "iot-embedded",
        "game-dev",
      ],
    };
  }

  // Tier 2: Vertical Head (Admin for that vertical)
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

  // Tier 4: Member (Writes drafts, PRs required)
  return {
    username,
    role: "member",
    verticals: [],
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

  const allVerticalSlugs = [
    "ai-ml",
    "web-dev",
    "cybersecurity",
    "cloud-devops",
    "competitive-programming",
    "mobile-dev",
    "ui-ux",
    "blockchain",
    "iot-embedded",
    "game-dev",
  ];

  for (const vertical of allVerticalSlugs) {
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
