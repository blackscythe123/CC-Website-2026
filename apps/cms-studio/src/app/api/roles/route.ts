import { NextRequest, NextResponse } from "next/server";
import { readRoles, writeRolesAndSyncCodeowners, getUserRoleInfo } from "@/lib/roles";

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

    if (roleInfo.role !== "superadmin") {
      return NextResponse.json(
        { error: "Access Denied. Only Superadmins can view and manage roles." },
        { status: 403 }
      );
    }

    const roles = readRoles();
    return NextResponse.json({ roles });
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

    if (roleInfo.role !== "superadmin") {
      return NextResponse.json(
        { error: "Access Denied. Only Superadmins can modify role assignments." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, targetUsername, role, vertical } = body;

    if (!targetUsername || !role) {
      return NextResponse.json(
        { error: "targetUsername and role are required." },
        { status: 400 }
      );
    }

    const cleanUser = targetUsername.replace(/^@/, "").trim().toLowerCase();
    const roles = readRoles();
    roles.superadmins = roles.superadmins || [];
    roles.vertical_heads = roles.vertical_heads || {};
    roles.deputies = roles.deputies || {};

    if (action === "assign") {
      if (role === "superadmin") {
        if (!roles.superadmins.map((u) => u.toLowerCase()).includes(cleanUser)) {
          roles.superadmins.push(cleanUser);
        }
      } else if (role === "vertical_head") {
        if (!vertical) {
          return NextResponse.json({ error: "Vertical is required for Vertical Head" }, { status: 400 });
        }
        roles.vertical_heads[vertical] = roles.vertical_heads[vertical] || [];
        if (!roles.vertical_heads[vertical].map((u) => u.toLowerCase()).includes(cleanUser)) {
          roles.vertical_heads[vertical].push(cleanUser);
        }
        // Remove from deputy of that vertical if being promoted
        if (roles.deputies[vertical]) {
          roles.deputies[vertical] = roles.deputies[vertical].filter((u) => u.toLowerCase() !== cleanUser);
        }
      } else if (role === "deputy") {
        if (!vertical) {
          return NextResponse.json({ error: "Vertical is required for Deputy" }, { status: 400 });
        }
        roles.deputies[vertical] = roles.deputies[vertical] || [];
        if (!roles.deputies[vertical].map((u) => u.toLowerCase()).includes(cleanUser)) {
          roles.deputies[vertical].push(cleanUser);
        }
        // Remove from head of that vertical if being demoted
        if (roles.vertical_heads[vertical]) {
          roles.vertical_heads[vertical] = roles.vertical_heads[vertical].filter((u) => u.toLowerCase() !== cleanUser);
        }
      }
    } else if (action === "remove") {
      if (role === "superadmin") {
        roles.superadmins = roles.superadmins.filter((u) => u.toLowerCase() !== cleanUser);
      } else if (role === "vertical_head" && vertical) {
        if (roles.vertical_heads[vertical]) {
          roles.vertical_heads[vertical] = roles.vertical_heads[vertical].filter(
            (u) => u.toLowerCase() !== cleanUser
          );
        }
      } else if (role === "deputy" && vertical) {
        if (roles.deputies[vertical]) {
          roles.deputies[vertical] = roles.deputies[vertical].filter(
            (u) => u.toLowerCase() !== cleanUser
          );
        }
      }
    }

    // Serverless-safe commit with GitHub Token
    await writeRolesAndSyncCodeowners(roles, token);

    return NextResponse.json({
      success: true,
      message: `Role hierarchy updated for @${cleanUser}`,
      roles,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update roles";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
