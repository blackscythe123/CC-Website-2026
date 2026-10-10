import { NextRequest, NextResponse } from "next/server";
import { getUserRoleInfo } from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request) || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.replace(/^@/, "").trim();

  if (!username || username.length < 2) {
    return NextResponse.json({ exists: false });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "coding-club-cms-studio",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
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
        bio: ghUser.bio || "",
      },
      currentRole,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error verifying GitHub user";
    return NextResponse.json({ exists: false, error: errorMsg }, { status: 500 });
  }
}
