import { NextRequest, NextResponse } from "next/server";
import { getUserRoleInfo } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("cc_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const userData = await res.json();
    const roleInfo = getUserRoleInfo(userData.login);

    return NextResponse.json({
      authenticated: true,
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
      },
      roleInfo,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error validating session";
    return NextResponse.json({ authenticated: false, error: errorMsg }, { status: 500 });
  }
}
