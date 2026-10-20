import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import {
  readRoles,
  getLiveClubRoles,
  getLiveUserRoleInfo,
  writeRolesAndSyncCodeowners,
  getUserRoleInfo,
  assignRole,
  removeRole,
  ALL_VERTICAL_SLUGS,
  GITHUB_USERNAME_REGEX,
} from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";

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
    const roleInfo = await getLiveUserRoleInfo(userData.login);

    if (
      roleInfo.role !== "superadmin" &&
      roleInfo.role !== "vertical_head" &&
      roleInfo.role !== "deputy"
    ) {
      return NextResponse.json(
        { error: "Access Denied. You do not have permission to view roles." },
        { status: 403 }
      );
    }

    const roles = await getLiveClubRoles();

    // Collect all candidate users
    const candidateMap = new Map<string, { login: string; name?: string; avatar_url?: string; status?: string }>();

    // 1. Superadmins
    roles.superadmins.forEach((u) => {
      candidateMap.set(u.toLowerCase(), { login: u, status: "Super Admin" });
    });

    // 2. Heads, deputies, members
    Object.values(roles.vertical_heads).flat().forEach((u) => {
      if (!candidateMap.has(u.toLowerCase())) candidateMap.set(u.toLowerCase(), { login: u, status: "Vertical Head" });
    });
    Object.values(roles.deputies).flat().forEach((u) => {
      if (!candidateMap.has(u.toLowerCase())) candidateMap.set(u.toLowerCase(), { login: u, status: "Deputy" });
    });
    Object.values(roles.members).flat().forEach((u) => {
      if (!candidateMap.has(u.toLowerCase())) candidateMap.set(u.toLowerCase(), { login: u, status: "Member" });
    });

    // 3. Pending requests
    (roles.pending_requests || []).forEach((req) => {
      candidateMap.set(req.username.toLowerCase(), {
        login: req.username,
        name: req.displayName || req.username,
        avatar_url: req.avatarUrl,
        status: `Applicant (${req.requestedRole})`,
      });
    });

    // 4. GitHub Collaborators & Invitations
    try {
      const ghOctokit = new Octokit({ auth: token || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN });
      const [collabsRes, invsRes] = await Promise.allSettled([
        ghOctokit.repos.listCollaborators({ owner: "blackscythe123", repo: "CC-Website-2026" }),
        ghOctokit.repos.listInvitations({ owner: "blackscythe123", repo: "CC-Website-2026" }),
      ]);

      if (collabsRes.status === "fulfilled" && collabsRes.value.data) {
        collabsRes.value.data.forEach((c) => {
          if (!candidateMap.has(c.login.toLowerCase())) {
            candidateMap.set(c.login.toLowerCase(), {
              login: c.login,
              avatar_url: c.avatar_url,
              status: "Collaborator",
            });
          }
        });
      }

      if (invsRes.status === "fulfilled" && invsRes.value.data) {
        invsRes.value.data.forEach((inv) => {
          if (inv.invitee && !candidateMap.has(inv.invitee.login.toLowerCase())) {
            candidateMap.set(inv.invitee.login.toLowerCase(), {
              login: inv.invitee.login,
              avatar_url: inv.invitee.avatar_url,
              status: "Invited Contributor",
            });
          }
        });
      }
    } catch {
      // Non-critical fallback
    }

    const candidates = Array.from(candidateMap.values());

    return NextResponse.json({ roles, currentRole: roleInfo, candidates });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load roles";
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
    const roleInfo = await getLiveUserRoleInfo(userData.login, true);

    const body = await request.json();
    const { action, targetUsername, role, vertical } = body;

    if (!action || !["assign", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "action must be either 'assign' or 'remove'." },
        { status: 400 }
      );
    }

    if (!targetUsername || !role) {
      return NextResponse.json(
        { error: "targetUsername and role are required." },
        { status: 400 }
      );
    }

    const cleanUsername = String(targetUsername).trim().replace(/^@/, "");
    if (!GITHUB_USERNAME_REGEX.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Invalid GitHub username. Traversal or special characters are strictly forbidden." },
        { status: 400 }
      );
    }

    const validRoles = ["superadmin", "vertical_head", "deputy", "member"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role '${role}'. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    if (role !== "superadmin") {
      if (!vertical || !ALL_VERTICAL_SLUGS.includes(vertical)) {
        return NextResponse.json(
          { error: `A valid technical vertical is required for role '${role}'. Allowed verticals: ${ALL_VERTICAL_SLUGS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Role Allocation Governance Check:
    if (role === "superadmin") {
      if (roleInfo.role !== "superadmin") {
        return NextResponse.json(
          { error: "Only existing Superadmins can allocate the Super Admin role." },
          { status: 403 }
        );
      }
    } else if (role === "vertical_head") {
      if (roleInfo.role !== "superadmin") {
        return NextResponse.json(
          { error: "Only Superadmins can appoint a Vertical Head." },
          { status: 403 }
        );
      }
    } else if (role === "deputy") {
      const isAuthorized =
        roleInfo.role === "superadmin" ||
        (roleInfo.role === "vertical_head" && vertical && roleInfo.verticals.includes(vertical));
      if (!isAuthorized) {
        return NextResponse.json(
          { error: `Only the Vertical Head or a Superadmin can assign Deputies for '${vertical}'.` },
          { status: 403 }
        );
      }
    } else if (role === "member") {
      const isAuthorized =
        roleInfo.role === "superadmin" ||
        ((roleInfo.role === "vertical_head" || roleInfo.role === "deputy") &&
          vertical &&
          roleInfo.verticals.includes(vertical));
      if (!isAuthorized) {
        return NextResponse.json(
          { error: `Only Deputies, Vertical Heads, or Superadmins can manage members for '${vertical}'.` },
          { status: 403 }
        );
      }
    }

    let roles = await getLiveClubRoles(true);

    if (action === "assign") {
      roles = assignRole(roles, cleanUsername, role, vertical);
    } else if (action === "remove") {
      roles = removeRole(roles, cleanUsername, role, vertical);
    }

    const reviewerDisplayName = userData.name || userData.login;
    const reviewerEmail = `${userData.login}@users.noreply.github.com`;
    const commitMessage = `chore(governance): @${userData.login} ${
      action === "assign"
        ? `assigned @${cleanUsername} as ${role}${vertical ? ` (${vertical})` : ""}`
        : `removed @${cleanUsername} from ${role}${vertical ? ` (${vertical})` : ""}`
    }`;

    // Serverless-safe commit with GitHub Token to main
    await writeRolesAndSyncCodeowners(roles, token, {
      name: reviewerDisplayName,
      email: reviewerEmail,
      message: commitMessage,
    });

    // Automatically manage repository collaborator access
    const activeAdminToken = process.env.GITHUB_ADMIN_TOKEN || token;
    let inviteDispatched = false;

    if (action === "assign") {
      try {
        const adminOctokit = new Octokit({ auth: activeAdminToken });
        await adminOctokit.repos.addCollaborator({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          username: cleanUsername,
          permission: "push",
        });
        inviteDispatched = true;
      } catch (invErr) {
        console.warn("Could not dispatch repo collaborator invite:", invErr);
      }
    } else if (action === "remove") {
      const remainingInfo = getUserRoleInfo(cleanUsername, roles);
      if (remainingInfo.role === "member" && remainingInfo.verticals.length === 0) {
        try {
          const adminOctokit = new Octokit({ auth: activeAdminToken });
          await adminOctokit.repos.removeCollaborator({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            username: cleanUsername,
          });
        } catch (remErr) {
          console.warn("Could not remove repo collaborator:", remErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${action === "assign" ? "Assigned" : "Removed"} ${role} successfully.${
        inviteDispatched ? " Repository collaborator invitation dispatched automatically." : ""
      }`,
      roles,
      inviteDispatched,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update roles";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
