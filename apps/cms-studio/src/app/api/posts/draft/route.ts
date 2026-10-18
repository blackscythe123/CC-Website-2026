import { NextRequest, NextResponse } from "next/server";
import { createDraftAndPullRequest, getPRDetails } from "@/lib/github";
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

    // Strictly enforce repository collaborator permission (Internal Tool)
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
          {
            error:
              "Access Denied: SSN Coding Club Studio is an internal tool. You are not a collaborator on 'blackscythe123/CC-Website-2026'. Please ask @blackscythe123 for repo collaborator access first.",
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Access Denied: You do not have collaborator access to 'blackscythe123/CC-Website-2026'. Please ask @blackscythe123 for repo collaborator access first.",
        },
        { status: 403 }
      );
    }

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

    if (title.trim().length < 3) {
      return NextResponse.json(
        { error: "Article title must be at least 3 characters." },
        { status: 400 }
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

    if (!ALLOWED_VERTICALS.includes(vertical)) {
      return NextResponse.json(
        { error: `Invalid vertical '${vertical}'. Allowed verticals are: ${ALLOWED_VERTICALS.join(", ")}` },
        { status: 400 }
      );
    }

    if (existingBranch && !/^(?:draft|cms)\/[a-z0-9_-]+\/[a-z0-9-]+$/.test(existingBranch)) {
      return NextResponse.json(
        { error: "Invalid branch format. Path traversal characters in branch names are strictly forbidden." },
        { status: 400 }
      );
    }

    let verifiedPullNumber: number | undefined = undefined;
    if (pullNumber) {
      const parsedPull = parseInt(String(pullNumber), 10);
      if (isNaN(parsedPull) || parsedPull <= 0) {
        return NextResponse.json({ error: "Invalid pullNumber format." }, { status: 400 });
      }

      // Anti-IDOR: verify that the PR actually belongs to the authenticated user (or superadmin)
      try {
        const prDetails = await getPRDetails(token, parsedPull);
        const prAuthor = prDetails.user?.login?.toLowerCase();
        if (prAuthor !== userData.login.toLowerCase() && roleInfo.role !== "superadmin") {
          return NextResponse.json(
            { error: "Access Denied: You cannot submit revisions to a Pull Request opened by another author." },
            { status: 403 }
          );
        }

        if (existingBranch && existingBranch !== prDetails.head.ref) {
          return NextResponse.json(
            {
              error: `Branch mismatch: specified branch '${existingBranch}' does not match PR branch '${prDetails.head.ref}'.`,
            },
            { status: 400 }
          );
        }
        verifiedPullNumber = parsedPull;
      } catch (prErr: unknown) {
        const errorMsg = prErr instanceof Error ? prErr.message : "Failed to verify Pull Request ownership";
        return NextResponse.json({ error: `Invalid PR #${parsedPull}: ${errorMsg}` }, { status: 404 });
      }
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

    // Role check for members
    if (roleInfo.role === "member") {
      if (!roleInfo.verticals || roleInfo.verticals.length === 0) {
        return NextResponse.json(
          {
            error:
              "You have not been assigned to any technical vertical yet. Please request a role assignment in Governance & Roles before submitting articles.",
          },
          { status: 403 }
        );
      }
      if (!roleInfo.verticals.includes(vertical)) {
        return NextResponse.json(
          {
            error: `As a Member, you are only authorized to draft articles for: ${roleInfo.verticals.join(", ")}`,
          },
          { status: 403 }
        );
      }
    }

    const rawSlug = (slug || title || "").trim();
    const cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80);

    if (!cleanSlug || cleanSlug.length < 2) {
      return NextResponse.json(
        { error: "Invalid article slug or title. Only alphanumeric characters and hyphens are permitted." },
        { status: 400 }
      );
    }

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
      targetPortals: Array.from(new Set([assignedPortal, "main-portal"])),
      tags: Array.isArray(tags) ? tags : [],
      markdownBody,
      pendingImages: Array.isArray(pendingImages) ? pendingImages : [],
      pullNumber: verifiedPullNumber,
      existingBranch: existingBranch || undefined,
    });

    return NextResponse.json({
      success: true,
      message: verifiedPullNumber
        ? `Revisions committed to PR #${verifiedPullNumber} successfully!`
        : `Post submitted for review! Pull Request #${result.pullNumber} opened.`,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Draft error:", err);
    const errorMsg = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
