import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { getLiveClubRoles, getUserRoleInfo } from "@/lib/roles";

async function whoAmI(token: string): Promise<{ login: string; name: string } | null> {
  const res = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "coding-club-cms-studio" } });
  if (!res.ok) return null;
  const u = await res.json();
  return { login: String(u.login), name: String(u.name || u.login) };
}
import { withdrawPullRequest } from "@/lib/github";

/** POST /api/posts/withdraw { pullNumber } — close your own pending Studio PR (any, for a Superadmin). */
export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized. Please log in with GitHub." }, { status: 401 });
  let body: { pullNumber?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const pullNumber = Number(body.pullNumber);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) return NextResponse.json({ error: "A valid pullNumber is required." }, { status: 400 });
  try {
    const me = await whoAmI(token);
    if (!me) return NextResponse.json({ error: "Invalid GitHub token." }, { status: 401 });
    const roleInfo = getUserRoleInfo(me.login, await getLiveClubRoles(true, { token }));
    const r = await withdrawPullRequest(
      token,
      pullNumber,
      me.login,
      (vertical) => roleInfo.role === "superadmin" || roleInfo.rolesByVertical?.[vertical] === "vertical_head"
    );
    if (r.status !== 200) return NextResponse.json({ error: r.message }, { status: r.status });
    return NextResponse.json({ success: true, message: r.message });
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "Couldn't withdraw the request";
    if (status && status >= 400 && status < 500) return NextResponse.json({ error: message }, { status });
    if (status === 503) return NextResponse.json({ error: message }, { status: 503 });
    console.error("Couldn't withdraw the request:", err);
    return NextResponse.json({ error: "Couldn't withdraw the request" }, { status: 500 });
  }
}
