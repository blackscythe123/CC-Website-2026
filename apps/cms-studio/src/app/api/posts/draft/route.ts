import { NextRequest, NextResponse } from "next/server";
import { createDraftAndPullRequest } from "@/lib/github";
import { getUserRoleInfo } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const token =
    request.cookies.get("cc_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

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
    const { vertical, slug, title, summary, coverImage, tags, markdownBody, pendingImages } = body;

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
