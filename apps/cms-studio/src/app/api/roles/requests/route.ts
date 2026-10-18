import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import {
  readRoles,
  writeRolesAndSyncCodeowners,
  getUserRoleInfo,
  canApproveRoleRequest,
  assignRole,
  RoleRequest,
} from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";
const LABEL_ROLE_APPLICATION = "role-application";

interface GitHubIssueItem {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  state_reason?: string | null;
  created_at: string;
  user?: {
    login?: string;
    avatar_url?: string;
  } | null;
  closed_by?: {
    login?: string;
  } | null;
}

function parseRoleRequestIssue(issue: GitHubIssueItem): RoleRequest {
  const body = issue.body || "";
  let metadata: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    requestedRole?: "member" | "deputy" | "vertical_head";
    vertical?: string;
    note?: string;
  } = {};

  const jsonMatch = body.match(/```json:metadata\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      metadata = JSON.parse(jsonMatch[1]);
    } catch {
      // ignore json parse error
    }
  }

  // Fallback to title parsing: [Role Application] @username for vertical (role)
  const titleMatch = issue.title.match(/\[Role Application\]\s*@?([^\s]+)\s+for\s+([^\s]+)\s*\(([^)]+)\)/i);
  // SECURITY FIX: Strictly bind applicant username to authenticated GitHub issue author
  // Never trust user-mutable JSON metadata in the issue body for identity
  const username = issue.user?.login || (titleMatch ? titleMatch[1] : "unknown");
  const vertical = metadata.vertical || (titleMatch ? titleMatch[2] : "ai-ml");
  const rawRole = metadata.requestedRole || (titleMatch ? titleMatch[3].toLowerCase() : "member");
  const requestedRole: "member" | "deputy" | "vertical_head" =
    rawRole === "vertical_head" ? "vertical_head" : rawRole === "deputy" ? "deputy" : "member";

  let status: "pending" | "approved" | "rejected" = "pending";
  if (issue.state === "closed") {
    status = issue.state_reason === "not_planned" ? "rejected" : "approved";
  }

  return {
    id: issue.number.toString(),
    username,
    displayName: metadata.displayName || username,
    avatarUrl: metadata.avatarUrl || issue.user?.avatar_url || "",
    requestedRole,
    vertical,
    note: metadata.note || "",
    createdAt: issue.created_at,
    status,
    reviewedBy: issue.closed_by?.login,
  };
}

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
    const activeToken = process.env.GITHUB_ADMIN_TOKEN || token;
    const octokit = new Octokit({ auth: activeToken });

    let issueRequests: RoleRequest[] = [];
    try {
      // Query recent issues and match either by label or by [Role Application] title prefix
      // (Handles GitHub stripping labels when non-collaborator applicants submit issues)
      const { data: issues } = await octokit.issues.listForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: 50,
      });

      const roleIssues = issues.filter((iss) => {
        const hasLabel = iss.labels?.some(
          (lbl) =>
            (typeof lbl === "string" ? lbl : lbl.name)?.toLowerCase() ===
            LABEL_ROLE_APPLICATION.toLowerCase()
        );
        const hasTitlePrefix = iss.title.trim().toLowerCase().startsWith("[role application]");
        return Boolean(hasLabel || hasTitlePrefix);
      });

      issueRequests = roleIssues.map(parseRoleRequestIssue);
    } catch (issueErr) {
      console.warn("Failed to fetch issues for role applications:", issueErr);
    }

    // Also include any legacy requests from roles.json
    const roles = readRoles();
    const legacyRequests: RoleRequest[] = roles.pending_requests || [];
    const allRequests: RoleRequest[] = [
      ...issueRequests,
      ...legacyRequests.filter((r) => !issueRequests.some((ir) => ir.id === r.id)),
    ];

    // Filter requests according to review authority:
    const visibleRequests = allRequests.filter((req) => {
      if (roleInfo.role === "superadmin") return true;
      if (req.username.toLowerCase() === userData.login.toLowerCase()) return true;

      const userRoleInVert = roleInfo.rolesByVertical?.[req.vertical] || roleInfo.role;
      if (userRoleInVert === "superadmin") return true;
      if (userRoleInVert === "vertical_head") {
        return req.requestedRole === "member" || req.requestedRole === "deputy";
      }
      if (userRoleInVert === "deputy") {
        return req.requestedRole === "member";
      }
      return false;
    });

    return NextResponse.json({
      requests: visibleRequests,
      roleInfo,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load requests";
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
    const body = await request.json();
    const { vertical, requestedRole, note } = body;

    if (!vertical || !requestedRole) {
      return NextResponse.json(
        { error: "Vertical and requestedRole are required." },
        { status: 400 }
      );
    }

    if (requestedRole === "superadmin") {
      return NextResponse.json(
        { error: "Superadmin role cannot be requested. It is allocated directly by Superadmins." },
        { status: 403 }
      );
    }

    const activeToken = process.env.GITHUB_ADMIN_TOKEN || token;
    const octokit = new Octokit({ auth: token });
    const adminOctokit = new Octokit({ auth: activeToken });

    // Check if duplicate open issue already exists
    let existingDuplicate = false;
    try {
      const { data: existingIssues } = await adminOctokit.issues.listForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: "open",
        creator: userData.login,
      });

      existingDuplicate = existingIssues.some((iss) => {
        const hasLabel = iss.labels?.some(
          (lbl) =>
            (typeof lbl === "string" ? lbl : lbl.name)?.toLowerCase() ===
            LABEL_ROLE_APPLICATION.toLowerCase()
        );
        const hasTitlePrefix = iss.title.trim().toLowerCase().startsWith("[role application]");
        if (!hasLabel && !hasTitlePrefix) return false;

        const parsed = parseRoleRequestIssue(iss);
        return (
          parsed.username.toLowerCase() === userData.login.toLowerCase() &&
          parsed.vertical === vertical &&
          parsed.requestedRole === requestedRole
        );
      });
    } catch {
      // continue if list fails
    }

    if (existingDuplicate) {
      return NextResponse.json(
        { error: "You already have a pending application for this role and vertical." },
        { status: 400 }
      );
    }

    const title = `[Role Application] @${userData.login} for ${vertical} (${requestedRole})`;
    const issueBody = `### SSN Coding Club CMS Role Application

- **Applicant:** @${userData.login}
- **Display Name:** ${userData.name || userData.login}
- **Requested Role:** \`${requestedRole}\`
- **Vertical:** \`${vertical}\`
- **Note:** ${note ? note : "None provided."}

\`\`\`json:metadata
${JSON.stringify(
  {
    username: userData.login,
    displayName: userData.name || userData.login,
    avatarUrl: userData.avatar_url,
    requestedRole,
    vertical,
    note: note || "",
  },
  null,
  2
)}
\`\`\`
`;

    const { data: createdIssue } = await octokit.issues.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title,
      labels: [LABEL_ROLE_APPLICATION],
      body: issueBody,
    });

    // Ensure the label is attached using the privileged admin token
    // (since GitHub API silently drops labels if applicant is not yet a repo collaborator)
    if (process.env.GITHUB_ADMIN_TOKEN) {
      try {
        await adminOctokit.issues.addLabels({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          issue_number: createdIssue.number,
          labels: [LABEL_ROLE_APPLICATION],
        });
      } catch (labelErr) {
        console.warn("Could not attach label with admin token:", labelErr);
      }
    }

    const parsedRequest = parseRoleRequestIssue(createdIssue);

    return NextResponse.json({
      success: true,
      message: `Your request to join ${vertical} as ${requestedRole} has been submitted as Application #${createdIssue.number}!`,
      request: parsedRequest,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to submit request";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { requestId, action } = body;

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and valid action ('approve' | 'reject') are required." },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });
    const issueNumber = parseInt(requestId, 10);
    let targetReq: RoleRequest | null = null;

    if (!isNaN(issueNumber)) {
      try {
        const { data: issue } = await octokit.issues.get({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          issue_number: issueNumber,
        });
        targetReq = parseRoleRequestIssue(issue);
      } catch (err) {
        console.warn("Could not fetch issue:", err);
      }
    }

    let roles = readRoles();
    if (!targetReq) {
      targetReq = roles.pending_requests?.find((r) => r.id === requestId) || null;
    }

    if (!targetReq) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    // Verify reviewer authority
    const canApprove = canApproveRoleRequest(
      userData.login,
      targetReq.requestedRole,
      targetReq.vertical
    );

    if (!canApprove) {
      return NextResponse.json(
        {
          error: `Access Denied: You do not possess the required hierarchy level to ${action} this request.`,
        },
        { status: 403 }
      );
    }

    if (action === "approve") {
      roles = assignRole(roles, targetReq.username, targetReq.requestedRole, targetReq.vertical);
      if (roles.pending_requests) {
        roles.pending_requests = roles.pending_requests.filter((r) => r.id !== targetReq.id);
      }

      const reviewerDisplayName = userData.name || userData.login;
      const reviewerEmail = `${userData.login}@users.noreply.github.com`;
      const commitMessage = `chore(governance): @${userData.login} approved & invited @${targetReq.username} as ${targetReq.requestedRole} (${targetReq.vertical})`;

      // Layer 1: Cryptographic Git author attestation with fallback to GITHUB_ADMIN_TOKEN
      await writeRolesAndSyncCodeowners(roles, token, {
        name: reviewerDisplayName,
        email: reviewerEmail,
        message: commitMessage,
      });

      // Dispatch repository collaborator invitation if admin token is available
      let inviteDispatched = false;
      const adminToken = process.env.GITHUB_ADMIN_TOKEN || token;
      try {
        const adminOctokit = new Octokit({ auth: adminToken });
        await adminOctokit.repos.addCollaborator({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          username: targetReq.username,
          permission: "push",
        });
        inviteDispatched = true;
      } catch (invErr) {
        console.warn("Could not dispatch repo collaborator invite:", invErr);
      }

      // Layer 2: Public GitHub Issue Audit Comment
      if (!isNaN(issueNumber)) {
        try {
          const nowIso = new Date().toISOString();
          const auditComment = [
            `🔒 **Official Governance Audit Log**`,
            `• **Applicant:** @${targetReq.username}`,
            `• **Assigned Role:** \`${targetReq.requestedRole}\` (\`${targetReq.vertical}\`)`,
            `• **Approved By:** @${userData.login} (Role: \`${reviewerRoleInfo.role}\`)`,
            `• **Action:** ${
              inviteDispatched
                ? "Repository collaborator invite dispatched automatically via GitHub API."
                : "Role assigned in roles.json hierarchy."
            }`,
            `• **Audit Timestamp:** \`${nowIso}\``,
          ].join("\n");

          await octokit.issues.createComment({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            issue_number: issueNumber,
            body: auditComment,
          });
          await octokit.issues.update({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            issue_number: issueNumber,
            state: "closed",
          });
        } catch (closeErr) {
          console.warn("Failed to close issue:", closeErr);
        }
      }
    } else {
      // Reject
      if (roles.pending_requests) {
        const r = roles.pending_requests.find((r) => r.id === targetReq.id);
        if (r) {
          r.status = "rejected";
          r.reviewedBy = userData.login;
          await writeRolesAndSyncCodeowners(roles, token);
        }
      }

      if (!isNaN(issueNumber)) {
        try {
          const nowIso = new Date().toISOString();
          const rejectComment = [
            `⛔ **Application Rejected**`,
            `• **Applicant:** @${targetReq.username}`,
            `• **Rejected By:** @${userData.login} (Role: \`${reviewerRoleInfo.role}\`)`,
            `• **Timestamp:** \`${nowIso}\``,
          ].join("\n");

          await octokit.issues.createComment({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            issue_number: issueNumber,
            body: rejectComment,
          });
          await octokit.issues.update({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            issue_number: issueNumber,
            state: "closed",
            state_reason: "not_planned",
          });
        } catch (closeErr) {
          console.warn("Failed to close issue:", closeErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action}d successfully.`,
      roles,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to review request";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
