import { NextRequest, NextResponse } from "next/server";
import {
  savePersonalDraftBranch,
  listPersonalDraftBranches,
  getPersonalDraftBranch,
} from "@/lib/github";
import { getSessionToken } from "@/lib/session";
import { getUserRoleInfo } from "@/lib/roles";

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
      return NextResponse.json({ draft });
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

    // Verify role assignment: Unassigned members cannot push branches
    const roleInfo = getUserRoleInfo(userData.login);
    if (roleInfo.role === "member") {
      if (!roleInfo.verticals || roleInfo.verticals.length === 0) {
        return NextResponse.json(
          {
            error:
              "Access Denied: You must be assigned to a technical vertical in Governance & Roles before saving remote draft branches.",
          },
          { status: 403 }
        );
      }
      if (vertical && !roleInfo.verticals.includes(vertical)) {
        return NextResponse.json(
          {
            error: `As a Member, you are only authorized to save drafts for: ${roleInfo.verticals.join(", ")}`,
          },
          { status: 403 }
        );
      }
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
