import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { getLiveClubRoles, getUserRoleInfo } from "@/lib/roles";

async function whoAmI(token: string): Promise<{ login: string; name: string } | null> {
  const res = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "coding-club-cms-studio" } });
  if (!res.ok) return null;
  const u = await res.json();
  return { login: String(u.login), name: String(u.name || u.login) };
}
import { listRecentlyUnpublished, restoreUnpublishedPost } from "@/lib/github";
import { canDeletePost } from "@/lib/roles";

/** GET /api/posts/restore → { posts: UnpublishedPost[] } recently unpublished articles the caller may restore. */
export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const me = await whoAmI(token);
    if (!me) return NextResponse.json({ error: "Invalid GitHub token." }, { status: 401 });
    const roles = await getLiveClubRoles(false, { token });
    const posts = (await listRecentlyUnpublished(token)).filter((p) => canDeletePost(me.login, p.vertical, roles));
    return NextResponse.json({ posts });
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "Couldn't load unpublished articles";
    if (status && status >= 400 && status < 500) return NextResponse.json({ error: message }, { status });
    if (status === 503) return NextResponse.json({ error: message }, { status: 503 });
    console.error("Couldn't load unpublished articles:", err);
    return NextResponse.json({ error: "Couldn't load unpublished articles" }, { status: 500 });
  }
}

/**
 * POST /api/posts/restore { vertical, slug } → { pullNumber, prUrl, branch }
 * Same people who may unpublish (that vertical's Head, or a Superadmin) may ask to restore; it is reviewed.
 */
export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized. Please log in with GitHub." }, { status: 401 });
  let body: { vertical?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const vertical = typeof body.vertical === "string" ? body.vertical : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  try {
    const me = await whoAmI(token);
    if (!me) return NextResponse.json({ error: "Invalid GitHub token." }, { status: 401 });
    const roles = await getLiveClubRoles(true, { token });
    if (!canDeletePost(me.login, vertical, roles)) {
      return NextResponse.json({ error: "Only that vertical's Head or a Superadmin can restore an article." }, { status: 403 });
    }
    const result = await restoreUnpublishedPost(token, vertical, slug, me.login);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "Couldn't restore the article";
    if (status && status >= 400 && status < 500) return NextResponse.json({ error: message }, { status });
    if (status === 503) return NextResponse.json({ error: message }, { status: 503 });
    console.error("Couldn't restore the article:", err);
    return NextResponse.json({ error: "Couldn't restore the article" }, { status: 500 });
  }
}
