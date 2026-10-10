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
    const { vertical, slug, title, summary, coverImage, tags, markdownBody, pendingImages, targetPortals } = body;

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

    // Portal destination permission check (Non-superadmins can only target main-portal and their assigned vertical portals)
    const PORTAL_VERTICAL_MAP: Record<string, string> = {
      "ai-ml-portal": "ai-ml",
      "ar-vr-portal": "ar-vr-game-dev",
      "cp-portal": "competitive-programming",
      "cybersecurity-portal": "cybersecurity",
      "ssnhacks-portal": "ssnhacks",
      "design-portal": "design-ui-ux",
      "full-stack-portal": "full-stack",
      "oss-portal": "open-source",
    };

    if (roleInfo.role !== "superadmin" && Array.isArray(targetPortals)) {
      for (const pId of targetPortals) {
        if (pId !== "main-portal" && PORTAL_VERTICAL_MAP[pId]) {
          const requiredVert = PORTAL_VERTICAL_MAP[pId];
          if (!roleInfo.verticals.includes(requiredVert)) {
            return NextResponse.json(
              {
                error: `Unauthorized destination portal '${pId}'. You are only authorized to publish to portals belonging to: ${roleInfo.verticals.join(", ")}`,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const cleanSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Create branch & PR on GitHub (never direct merge!)
    const result = await createDraftAndPullRequest({
      token,
      authorUsername: userData.login,
      authorDisplayName: userData.name || userData.login,
      vertical,
      slug: cleanSlug,
      title,
      summary: summary || "",
      coverImage: coverImage || "",
      targetPortals: Array.isArray(targetPortals) && targetPortals.length > 0 ? targetPortals : ["main-portal"],
      tags: Array.isArray(tags) ? tags : [],
      markdownBody,
      pendingImages: Array.isArray(pendingImages) ? pendingImages : [],
    });

    return NextResponse.json({
      success: true,
      message: `Post submitted for review! Pull Request #${result.pullNumber} opened.`,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Draft error:", err);
    const errorMsg = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
