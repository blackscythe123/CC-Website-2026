import { NextRequest, NextResponse } from "next/server";
import { listPendingReviewPRs, approveAndMergePR } from "@/lib/github";
import { getUserRoleInfo, canUserApproveVertical } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("cc_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

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
    const roleInfo = getUserRoleInfo(userData.login);

    const prs = await listPendingReviewPRs(token);

    // Filter PRs by user permissions
    const visiblePRs = prs.filter((pr) => {
      if (roleInfo.role === "superadmin" || roleInfo.role === "core_admin") {
        return true;
      }
      if (roleInfo.role === "vertical_head") {
        return roleInfo.verticals.includes(pr.vertical);
      }
      // Members only see PRs authored by themselves
      return pr.author.toLowerCase() === userData.login.toLowerCase();
    });

    return NextResponse.json({
      prs: visiblePRs,
      roleInfo,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load review PRs";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token =
    request.cookies.get("cc_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

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
    const body = await request.json();
    const { pullNumber, vertical } = body;

    if (!pullNumber) {
      return NextResponse.json({ error: "pullNumber is required" }, { status: 400 });
    }

    // Verify permission to approve
    if (!canUserApproveVertical(userData.login, vertical)) {
      return NextResponse.json(
        {
          error: `You are not authorized to approve articles for ${vertical}. Only designated Vertical Heads or Superadmins can approve.`,
        },
        { status: 403 }
      );
    }

    const result = await approveAndMergePR(token, pullNumber, userData.login);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `PR #${pullNumber} approved and merged into main! The post is now live.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to approve PR";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
