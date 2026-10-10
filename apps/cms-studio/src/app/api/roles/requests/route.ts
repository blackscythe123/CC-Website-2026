import { NextRequest, NextResponse } from "next/server";
import {
  readRoles,
  writeRolesAndSyncCodeowners,
  getUserRoleInfo,
  canApproveRoleRequest,
  assignRole,
  RoleRequest,
} from "@/lib/roles";

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
    const roles = readRoles();
    const allRequests: RoleRequest[] = roles.pending_requests || [];

    // Filter requests according to review authority:
    const visibleRequests = allRequests.filter((req) => {
      if (roleInfo.role === "superadmin") return true;
      if (req.username.toLowerCase() === userData.login.toLowerCase()) return true;
      if (roleInfo.role === "vertical_head" && roleInfo.verticals.includes(req.vertical)) {
        return req.requestedRole === "member" || req.requestedRole === "deputy";
      }
      if (roleInfo.role === "deputy" && roleInfo.verticals.includes(req.vertical)) {
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

    const roles = readRoles();
    roles.pending_requests = roles.pending_requests || [];

    // Check if duplicate pending request already exists
    const existing = roles.pending_requests.find(
      (r) =>
        r.username.toLowerCase() === userData.login.toLowerCase() &&
        r.vertical === vertical &&
        r.requestedRole === requestedRole &&
        r.status === "pending"
    );

    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending request for this role and vertical." },
        { status: 400 }
      );
    }

    const newRequest: RoleRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: userData.login,
      displayName: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      requestedRole,
      vertical,
      note: note || "",
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    roles.pending_requests.push(newRequest);
    await writeRolesAndSyncCodeowners(roles, token);

    return NextResponse.json({
      success: true,
      message: `Your request to join ${vertical} as ${requestedRole} has been submitted for review!`,
      request: newRequest,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to submit request";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { requestId, action } = body;

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and valid action ('approve' | 'reject') are required." },
        { status: 400 }
      );
    }

    let roles = readRoles();
    roles.pending_requests = roles.pending_requests || [];

    const targetReq = roles.pending_requests.find((r) => r.id === requestId);
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

    targetReq.status = action === "approve" ? "approved" : "rejected";
    targetReq.reviewedBy = userData.login;

    if (action === "approve") {
      roles = assignRole(roles, targetReq.username, targetReq.requestedRole, targetReq.vertical);
    }

    await writeRolesAndSyncCodeowners(roles, token);

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
