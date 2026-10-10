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
      if (roleInfo.role === "superadmin") {
        return true;
      }
      if (roleInfo.role === "vertical_head" || roleInfo.role === "deputy") {
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
    const { pullNumber } = body;

    if (!pullNumber) {
      return NextResponse.json({ error: "pullNumber is required" }, { status: 400 });
    }

    // Anti-IDOR: Fetch actual PR from GitHub to verify true target vertical
    const { getPRDetails } = await import("@/lib/github");
    const prData = await getPRDetails(token, pullNumber);

    // Parse true vertical from PR title or branch name
    let actualVertical = "general";
    const titleMatch =
      prData.title.match(/\[(?:Draft:\s*)?([a-zA-Z0-9_-]+)\]/i) ||
      prData.title.match(/feat\(([a-zA-Z0-9_-]+)\)/i);
    const branchMatch = prData.head.ref.match(/^(?:draft|cms)\/([a-zA-Z0-9_-]+)\//i);

    if (titleMatch && titleMatch[1]) {
      actualVertical = titleMatch[1].toLowerCase();
    } else if (branchMatch && branchMatch[1]) {
      actualVertical = branchMatch[1].toLowerCase();
    }

    // Verify permission to approve against true vertical
    if (!canUserApproveVertical(userData.login, actualVertical)) {
      return NextResponse.json(
        {
          error: `Access Denied: You are not authorized to approve articles for '${actualVertical}'. Only designated Vertical Heads, Deputies, or Superadmins can approve.`,
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
