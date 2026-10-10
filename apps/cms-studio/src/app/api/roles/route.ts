import { NextRequest, NextResponse } from "next/server";
import {
  readRoles,
  writeRolesAndSyncCodeowners,
  getUserRoleInfo,
  assignRole,
  removeRole,
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

    const roles = readRoles();
    return NextResponse.json({ roles, currentRole: roleInfo });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load roles";
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
    const roleInfo = getUserRoleInfo(userData.login);

    const body = await request.json();
    const { action, targetUsername, role, vertical } = body;

    if (!targetUsername || !role) {
      return NextResponse.json(
        { error: "targetUsername and role are required." },
        { status: 400 }
      );
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

    let roles = readRoles();

    if (action === "assign") {
      roles = assignRole(roles, targetUsername, role, vertical);
    } else if (action === "remove") {
      roles = removeRole(roles, targetUsername, role, vertical);
    }

    // Serverless-safe commit with GitHub Token to main
    await writeRolesAndSyncCodeowners(roles, token);

    return NextResponse.json({
      success: true,
      message: `${action === "assign" ? "Assigned" : "Removed"} ${role} successfully.`,
      roles,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update roles";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
