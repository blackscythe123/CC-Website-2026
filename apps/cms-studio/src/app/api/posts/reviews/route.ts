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
    const roleInfo = getUserRoleInfo(userData.login, await getLiveClubRoles(false, { token }));

    const { searchParams } = new URL(request.url);
    const previewPullNumber = searchParams.get("previewPullNumber");

    if (previewPullNumber) {
      const n = Number(previewPullNumber);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: "Invalid previewPullNumber." }, { status: 400 });
      }
      const article = await getPRArticleContent(token, n);
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
      const roleHere = roleInfo.rolesByVertical?.[pr.vertical];
      return roleHere === "vertical_head" || roleHere === "deputy";
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
    const allRoles = await getLiveClubRoles(true, { token });
    const reviewerRoleInfo = getUserRoleInfo(userData.login, allRoles);
    let body: { pullNumber?: unknown; action?: unknown; reason?: unknown; expectedHeadSha?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const pullNumber = Number(body.pullNumber);
    const action = body.action === undefined ? "approve" : body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const expectedHeadSha = typeof body.expectedHeadSha === "string" ? body.expectedHeadSha : "";

    if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
      return NextResponse.json({ error: "A valid pullNumber is required." }, { status: 400 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
    }
    if (!/^[0-9a-f]{40}$/.test(expectedHeadSha)) {
      return NextResponse.json(
        { error: "Reopen the article preview and review again (missing reviewed version)." },
        { status: 400 }
      );
    }
    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "A feedback reason is required when requesting changes or rejecting." },
        { status: 400 }
      );
    }

    // Anti-IDOR: the PR author and the vertical come from GitHub, never from the request
    const prData = await getPRDetails(token, pullNumber);
    const authorUsername = prData.user?.login || "unknown";
    if (userData.login.toLowerCase() === authorUsername.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Access Denied: Self-review is strictly forbidden. Authors cannot review, approve, or request changes on their own pull requests.",
        },
        { status: 403 }
      );
    }

    // The true vertical comes from the article file location (fail closed: no title/branch fallback)
    let actualVertical: string;
    let articleAuthorUsername = "";
    let articleTitle = "";
    try {
      const article = await getPRArticleContent(token, pullNumber);
      actualVertical = article.vertical.toLowerCase();
      articleAuthorUsername = article.authorUsername || "";
      articleTitle = article.title || "";
    } catch (articleErr) {
      const msg = articleErr instanceof Error ? articleErr.message : "Could not read the article in this PR.";
      return NextResponse.json({ error: `Cannot review this PR: ${msg}` }, { status: 400 });
    }

    if (!canUserApproveVertical(userData.login, actualVertical, allRoles)) {
      return NextResponse.json(
        {
          error: `Access Denied: You are not authorized to review articles for '${actualVertical}'. Only designated Vertical Heads, Deputies, or Superadmins can review.`,
        },
        { status: 403 }
      );
    }

    const authorRoleInfo = getUserRoleInfo(authorUsername, allRoles);
    const reviewOptions = {
      token,
      pullNumber,
      reviewerUsername: userData.login as string,
      reviewerRole: roleInVertical(reviewerRoleInfo, actualVertical),
      targetVertical: actualVertical,
      authorRole: roleInVertical(authorRoleInfo, actualVertical),
      deputyUsernames: allRoles.deputies[actualVertical] || [],
      articleAuthorUsername,
      expectedHeadSha,
      articleTitle,
    };

    if (action === "reject") {
      const rejectResult = await rejectPR({ ...reviewOptions, reason });
      if (!rejectResult.success) {
        return NextResponse.json({ error: rejectResult.message }, { status: rejectResult.status || 400 });
      }
      return NextResponse.json({ success: true, message: rejectResult.message });
    }

    const result = await approveAndMergePR(reviewOptions);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      merged: result.merged,
      message: result.message,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process review";
    const status = (err as { status?: number }).status;
    return NextResponse.json({ error: errorMsg }, { status: status === 404 || status === 503 ? status : 500 });
  }
}
