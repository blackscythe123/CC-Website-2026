import { NextRequest, NextResponse } from "next/server";
import {
  savePersonalDraftBranch,
  listPersonalDraftBranches,
  getPersonalDraftBranch,
  getOctokit,
} from "@/lib/github";
import { getSessionToken } from "@/lib/session";
import { getUserRoleInfo, getLiveClubRoles } from "@/lib/roles";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";
const UPLOADS_DIR = "apps/main-portal/public/uploads";
const SAFE_UPLOAD_FILE = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/;
/** Total base64 payload returned with a draft; keeps the response well under serverless limits. */
const MAX_PENDING_IMAGE_BYTES = Math.floor(3.5 * 1024 * 1024);
const MIME_BY_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/**
 * `/uploads/<file>` images a WIP draft references that exist on the draft branch but NOT on main.
 * Submitting makes a new branch from main, so the client re-uploads these (as pending images) or the
 * published article would point at files that were never merged.
 */
async function collectBranchOnlyImages(token: string, branch: string, markdownBody: string, coverImage: string) {
  const octokit = getOctokit(token);
  const files = new Set<string>();
  for (const text of [markdownBody || "", coverImage || ""]) {
    for (const m of text.matchAll(/\/uploads\/([A-Za-z0-9._-]+)/g)) {
      if (SAFE_UPLOAD_FILE.test(m[1])) files.add(m[1]);
    }
  }

  const out: { filename: string; base64: string; mimeType: string; uploadPath: string }[] = [];
  let total = 0;
  for (const filename of files) {
    const path = `${UPLOADS_DIR}/${filename}`;
    try {
      // Already published on main: the /uploads link keeps working, nothing to carry over.
      await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path, ref: "main" });
      continue;
    } catch (err) {
      if ((err as { status?: number }).status !== 404) continue; // unknown state: don't guess
    }
    try {
      const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path, ref: branch });
      if (Array.isArray(data) || data.type !== "file") continue;
      let base64 = typeof data.content === "string" ? data.content.replace(/\s/g, "") : "";
      if (!base64 && data.sha) {
        const blob = await octokit.git.getBlob({ owner: REPO_OWNER, repo: REPO_NAME, file_sha: data.sha });
        base64 = blob.data.content.replace(/\s/g, "");
      }
      if (!base64 || total + base64.length > MAX_PENDING_IMAGE_BYTES) continue;
      total += base64.length;
      const ext = filename.split(".").pop()!.toLowerCase();
      out.push({ filename, base64, mimeType: MIME_BY_EXT[ext] || "image/png", uploadPath: `/uploads/${filename}` });
    } catch {
      // not on the draft branch either: leave the link as is
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch");

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Invalid GitHub token" }, { status: 401 });
    }

    const userData = await userRes.json();

    if (branch) {
      // Strictly enforce safe branch regex and user ownership
      const userPrefix = `drafts/${userData.login.toLowerCase()}/`;
      const isFormatSafe = /^drafts\/[a-z0-9._-]+\/[a-z0-9-]+$/.test(branch);
      if (!branch.startsWith(userPrefix) || !isFormatSafe) {
        return NextResponse.json({ error: "Unauthorized access or invalid draft branch name" }, { status: 403 });
      }
      const draft = await getPersonalDraftBranch(token, branch);
      let pendingImages: Awaited<ReturnType<typeof collectBranchOnlyImages>> = [];
      try {
        pendingImages = await collectBranchOnlyImages(token, branch, draft.markdownBody || "", draft.coverImage || "");
      } catch (imgErr) {
        console.error("Could not collect draft-branch images:", imgErr);
      }
      return NextResponse.json({ draft, pendingImages });
    }

    // List all personal draft branches
    const drafts = await listPersonalDraftBranches(token, userData.login);
    return NextResponse.json({ drafts });
  } catch (err: any) {
    console.error("Error in remote drafts GET route:", err);
    return NextResponse.json({ error: err.message || "Failed to load remote drafts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Invalid GitHub token" }, { status: 401 });
    }

    const userData = await userRes.json();

    // Verify repo collaborator status
    const repoRes = await fetch("https://api.github.com/repos/blackscythe123/CC-Website-2026", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      if (!repoData.permissions?.push && !repoData.permissions?.admin) {
        return NextResponse.json(
          { error: "Access Denied: Internal tool only. Repo collaborator permission required." },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Access Denied: Repository collaborator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { vertical, slug, title, summary, coverImage, tags, markdownBody, pendingImages, targetPortals } = body;

    const roleInfo = getUserRoleInfo(userData.login, await getLiveClubRoles(true, { token }));
    if (roleInfo.role !== "superadmin" && (!roleInfo.verticals || roleInfo.verticals.length === 0)) {
      return NextResponse.json(
        {
          error:
            "Access Denied: You must be assigned to a technical vertical in Governance & Roles before saving remote draft branches.",
        },
        { status: 403 }
      );
    }

    const ALLOWED_VERTICALS = [
      "ai-ml",
      "ar-vr-game-dev",
      "competitive-programming",
      "cybersecurity",
      "ssnhacks",
      "design-ui-ux",
      "full-stack",
      "open-source",
      "club",
    ];

    const safeVertical = vertical || "club";
    if (!ALLOWED_VERTICALS.includes(safeVertical)) {
      return NextResponse.json(
        { error: `Invalid vertical '${safeVertical}'. Allowed verticals are: ${ALLOWED_VERTICALS.join(", ")}` },
        { status: 400 }
      );
    }

    // Same vertical authorization as POST /api/posts/draft: club announcements are superadmin-only, and
    // everyone else may only save drafts for verticals where they hold a role.
    if (roleInfo.role !== "superadmin") {
      if (safeVertical === "club") {
        return NextResponse.json({ error: "Only Superadmins can save Club Announcement drafts." }, { status: 403 });
      }
      const assigned = Object.keys(roleInfo.rolesByVertical || {});
      if (!assigned.includes(safeVertical)) {
        return NextResponse.json(
          { error: `You can only save drafts for your own verticals: ${assigned.join(", ") || "none"}` },
          { status: 403 }
        );
      }
    }

    const rawSlug = (slug || title || "untitled").trim();
    const cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50);

    if (!cleanSlug) {
      return NextResponse.json({ error: "Invalid draft title or slug" }, { status: 400 });
    }

    const result = await savePersonalDraftBranch({
      token,
      authorUsername: userData.login,
      authorDisplayName: userData.name || userData.login,
      vertical: safeVertical,
      slug: cleanSlug,
      title: title || "Untitled Draft",
      summary: summary || "",
      coverImage,
      tags: tags || [],
      markdownBody: markdownBody || "",
      pendingImages,
      targetPortals,
    });

    return NextResponse.json({ success: true, branch: result.branch });
  } catch (err: any) {
    console.error("Error saving remote personal draft:", err);
    return NextResponse.json({ error: err.message || "Failed to save remote draft" }, { status: 500 });
  }
}
