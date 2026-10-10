import fs from "fs";
import path from "path";

export interface ClubRoles {
  superadmins: string[];
  core_admins: string[];
  vertical_heads: Record<string, string[]>;
}

export type UserRoleType = "superadmin" | "core_admin" | "vertical_head" | "member";

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
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading roles.json:", err);
  }

  // Fallback defaults
  return {
    superadmins: ["blackscythe123"],
    core_admins: ["blackscythe123"],
    vertical_heads: {
      "ai-ml": ["blackscythe123"],
      "web-dev": ["sarah-j"],
      "cybersecurity": ["m-thorne"],
      "cloud-devops": ["elena-cloud"],
      "competitive-programming": ["rohan-algo"],
      "mobile-dev": ["maya-apps"],
      "ui-ux": ["chloe-design"],
      "blockchain": ["tariq-chain"],
      "iot-embedded": ["vikram-iot"],
      "game-dev": ["lucas-games"],
    },
  };
}

export function getUserRoleInfo(username: string): UserRoleInfo {
  const normalized = username.toLowerCase().trim();
  const roles = readRoles();

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

  const isCore = roles.core_admins.some((u) => u.toLowerCase() === normalized);
  if (isCore) {
    return {
      username,
      role: "core_admin",
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

  const managedVerticals: string[] = [];
  for (const [vertical, heads] of Object.entries(roles.vertical_heads)) {
    if (heads.some((u) => u.toLowerCase() === normalized)) {
      managedVerticals.push(vertical);
    }
  }

  if (managedVerticals.length > 0) {
    return {
      username,
      role: "vertical_head",
      verticals: managedVerticals,
    };
  }

  return {
    username,
    role: "member",
    verticals: [],
  };
}

export function canUserApproveVertical(username: string, vertical: string): boolean {
  const info = getUserRoleInfo(username);
  if (info.role === "superadmin" || info.role === "core_admin") return true;
  if (info.role === "vertical_head" && info.verticals.includes(vertical)) return true;
  return false;
}

export function writeRolesAndSyncCodeowners(roles: ClubRoles): void {
  const rolesPath = getRolesFilePath();
  const dir = path.dirname(rolesPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(rolesPath, JSON.stringify(roles, null, 2), "utf-8");

  // Sync to .github/CODEOWNERS
  const superowner = roles.superadmins[0] ? `@${roles.superadmins[0]}` : "@blackscythe123";
  let codeownersContent = `# SSN Coding Club CMS - Code Owners & Editorial Approval Mapping\n# Auto-generated from content/club/roles.json\n\n`;
  codeownersContent += `* ${superowner}\n\n`;
  codeownersContent += `# Announcements & Club Core\ncontent/club/** ${roles.core_admins.map((u) => `@${u}`).join(" ") || superowner}\n\n`;

  for (const [vertical, heads] of Object.entries(roles.vertical_heads)) {
    const reviewers = heads.length > 0 ? heads.map((h) => `@${h}`).join(" ") : superowner;
    codeownersContent += `content/verticals/${vertical}/** ${reviewers}\n`;
  }

  try {
    const codeownersPath = getCodeownersPath();
    const cDir = path.dirname(codeownersPath);
    if (!fs.existsSync(cDir)) {
      fs.mkdirSync(cDir, { recursive: true });
    }
    fs.writeFileSync(codeownersPath, codeownersContent, "utf-8");
  } catch (err) {
    console.error("Failed to sync CODEOWNERS locally:", err);
  }
}
