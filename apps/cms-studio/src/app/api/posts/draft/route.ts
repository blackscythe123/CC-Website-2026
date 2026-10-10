import { NextRequest, NextResponse } from "next/server";
import { createDraftAndPullRequest } from "@/lib/github";
import { getUserRoleInfo } from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized. Please log in with GitHub." }, { status: 401 });
  }

  try {
    // 1. Verify user identity
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Invalid GitHub token." }, { status: 401 });
    }

    const userData = await userRes.json();
    const roleInfo = getUserRoleInfo(userData.login);

    const body = await request.json();
    const {
      vertical,
      slug,
      title,
      summary,
      coverImage,
      tags,
      markdownBody,
      pendingImages,
      pullNumber,
      existingBranch,
    } = body;

    if (!vertical || !title || !markdownBody) {
      return NextResponse.json(
        { error: "Vertical, title, and article body are required." },
        { status: 400 }
      );
    }

    // Role check for club-wide announcements
    if (vertical === "club" && roleInfo.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only Superadmins can publish Club Announcements." },
        { status: 403 }
      );
    }

    // Role check for vertical heads and deputies
    if (
      (roleInfo.role === "vertical_head" || roleInfo.role === "deputy") &&
      !roleInfo.verticals.includes(vertical)
    ) {
      return NextResponse.json(
        {
          error: `As a ${
            roleInfo.role === "vertical_head" ? "Vertical Head" : "Deputy"
          }, you are authorized to draft articles for: ${roleInfo.verticals.join(", ")}`,
        },
        { status: 403 }
      );
    }

    const cleanSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // 1-to-1 Vertical to Portal Mapping (Zero Contradiction Architecture)
    const VERTICAL_PORTAL_MAP: Record<string, string> = {
      "ai-ml": "ai-ml-portal",
      "ar-vr-game-dev": "ar-vr-portal",
      "competitive-programming": "cp-portal",
      "cybersecurity": "cybersecurity-portal",
      "ssnhacks": "ssnhacks-portal",
      "design-ui-ux": "design-portal",
      "full-stack": "full-stack-portal",
      "open-source": "oss-portal",
      "club": "main-portal",
    };

    const assignedPortal = VERTICAL_PORTAL_MAP[vertical] || "main-portal";

    // Create or update branch & PR on GitHub (never direct merge!)
    const result = await createDraftAndPullRequest({
      token,
      authorUsername: userData.login,
      authorDisplayName: userData.name || userData.login,
      vertical,
      slug: cleanSlug,
      title,
      summary: summary || "",
      coverImage: coverImage || "",
      targetPortals: [assignedPortal],
      tags: Array.isArray(tags) ? tags : [],
      markdownBody,
      pendingImages: Array.isArray(pendingImages) ? pendingImages : [],
      pullNumber: pullNumber ? parseInt(String(pullNumber), 10) : undefined,
      existingBranch: existingBranch || undefined,
    });

    return NextResponse.json({
      success: true,
      message: pullNumber
        ? `Revisions committed to PR #${pullNumber} successfully!`
        : `Post submitted for review! Pull Request #${result.pullNumber} opened.`,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Draft error:", err);
    const errorMsg = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
