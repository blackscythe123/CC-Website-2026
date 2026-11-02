import { NextRequest, NextResponse } from "next/server";
import {
  listPendingReviewPRs,
  approveAndMergePR,
  rejectPR,
  getPRDetails,
  getPRArticleContent,
  roleInVertical,
} from "@/lib/github";
import { getUserRoleInfo, canUserApproveVertical, getLiveClubRoles } from "@/lib/roles";
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
    const roleInfo = getUserRoleInfo(userData.login, await getLiveClubRoles());

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
    // Authorization must use live roles.json from main, never the build-time copy or a stale cache
    const allRoles = await getLiveClubRoles(true);
    const reviewerRoleInfo = getUserRoleInfo(userData.login, allRoles);
    const body = await request.json();
    const { pullNumber, action = "approve", reason } = body;

    if (!pullNumber) {
      return NextResponse.json({ error: "pullNumber is required" }, { status: 400 });
    }

    // Anti-IDOR: Fetch actual PR from GitHub to verify true target vertical
    const prData = await getPRDetails(token, pullNumber);
    const authorUsername = prData.user?.login || "unknown";

    // Strictly enforce anti-self-review: Authors can NEVER review or approve their own PRs
    if (userData.login.toLowerCase() === authorUsername.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Access Denied: Self-review is strictly forbidden. Authors cannot review, approve, or request changes on their own pull requests.",
        },
        { status: 403 }
      );
    }

    // Determine the true vertical from the article file location (fail closed: no title/branch fallback)
    let actualVertical: string;
    let articleAuthorUsername = "";
    try {
      const article = await getPRArticleContent(token, pullNumber);
      actualVertical = article.vertical.toLowerCase();
      articleAuthorUsername = article.authorUsername || "";
    } catch (articleErr) {
      const msg = articleErr instanceof Error ? articleErr.message : "Could not read the article in this PR.";
      return NextResponse.json({ error: `Cannot review this PR: ${msg}` }, { status: 400 });
    }

    // Verify reviewer authority
    if (!canUserApproveVertical(userData.login, actualVertical, allRoles)) {
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
    const authorRoleInfo = getUserRoleInfo(authorUsername, allRoles);
    const deputiesInVertical = allRoles.deputies[actualVertical] || [];

    const result = await approveAndMergePR({
      token,
      pullNumber,
      reviewerUsername: userData.login,
      reviewerRole: roleInVertical(reviewerRoleInfo, actualVertical),
      targetVertical: actualVertical,
      authorRole: roleInVertical(authorRoleInfo, actualVertical),
      deputyUsernames: deputiesInVertical,
      articleAuthorUsername,
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
