import { NextRequest, NextResponse } from "next/server";
import {
  listPendingReviewPRs,
  approveAndMergePR,
  rejectPR,
  getPRDetails,
  getPRArticleContent,
} from "@/lib/github";
import { getUserRoleInfo, canUserApproveVertical, readRoles } from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
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
    const roleInfo = getUserRoleInfo(userData.login);

    const { searchParams } = new URL(request.url);
    const previewPullNumber = searchParams.get("previewPullNumber");

    if (previewPullNumber) {
      const article = await getPRArticleContent(token, parseInt(previewPullNumber, 10));
      return NextResponse.json({ success: true, article });
    }
    const prs = await listPendingReviewPRs(token);

    // Filter PRs by user permissions (Authors always see their own submitted articles)
    const visiblePRs = prs.filter((pr) => {
      if (pr.author.toLowerCase() === userData.login.toLowerCase()) {
        return true;
      }
      if (roleInfo.role === "superadmin") {
        return true;
      }
      if (roleInfo.role === "vertical_head" || roleInfo.role === "deputy") {
        return roleInfo.verticals.includes(pr.vertical);
      }
      return false;
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
    const reviewerRoleInfo = getUserRoleInfo(userData.login);
    const body = await request.json();
    const { pullNumber, action = "approve", reason } = body;

    if (!pullNumber) {
      return NextResponse.json({ error: "pullNumber is required" }, { status: 400 });
    }

    // Anti-IDOR: Fetch actual PR from GitHub to verify true target vertical
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

    // Verify reviewer authority
    if (!canUserApproveVertical(userData.login, actualVertical)) {
      return NextResponse.json(
        {
          error: `Access Denied: You are not authorized to review articles for '${actualVertical}'. Only designated Vertical Heads, Deputies, or Superadmins can review.`,
        },
        { status: 403 }
      );
    }

    // Handling Rejection with Reason
    if (action === "reject") {
      if (!reason || !reason.trim()) {
        return NextResponse.json(
          { error: "A feedback reason is required when requesting changes or rejecting." },
          { status: 400 }
        );
      }

      const rejectResult = await rejectPR(token, pullNumber, userData.login, reason.trim());
      if (!rejectResult.success) {
        return NextResponse.json({ error: rejectResult.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: rejectResult.message,
      });
    }

    // Handling Approval (Multi-Deputy Quorum check)
    const authorUsername = prData.user?.login || "unknown";
    const authorRoleInfo = getUserRoleInfo(authorUsername);
    const allRoles = readRoles();
    const deputiesInVertical = allRoles.deputies[actualVertical] || [];

    const result = await approveAndMergePR({
      token,
      pullNumber,
      reviewerUsername: userData.login,
      reviewerRole: reviewerRoleInfo.role,
      targetVertical: actualVertical,
      authorRole: authorRoleInfo.role,
      deputyUsernames: deputiesInVertical,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      merged: result.merged,
      message: result.message,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process review";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
