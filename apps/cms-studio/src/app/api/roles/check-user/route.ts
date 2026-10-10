import { NextRequest, NextResponse } from "next/server";
import { getUserRoleInfo } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("cc_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.replace(/^@/, "").trim();

  if (!username || username.length < 2) {
    return NextResponse.json({ exists: false });
  }

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ exists: false, error: "GitHub user not found" });
    }

    const ghUser = await res.json();
    const currentRole = getUserRoleInfo(ghUser.login);

    return NextResponse.json({
      exists: true,
      user: {
        login: ghUser.login,
        name: ghUser.name || ghUser.login,
        avatar_url: ghUser.avatar_url,
      },
      currentRole,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error verifying GitHub user";
    return NextResponse.json({ exists: false, error: errorMsg }, { status: 500 });
  }
}
