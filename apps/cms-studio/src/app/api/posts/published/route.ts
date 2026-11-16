import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { getLiveClubRoles, getUserRoleInfo } from "@/lib/roles";

async function whoAmI(token: string): Promise<{ login: string; name: string } | null> {
  const res = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "coding-club-cms-studio" } });
  if (!res.ok) return null;
  const u = await res.json();
  return { login: String(u.login), name: String(u.name || u.login) };
}
import matter from "gray-matter";
import { parsePlacement } from "@coding-club/content-schema/tracks";
import { getOctokit } from "@/lib/github";

const VERTICALS = ["ai-ml", "ar-vr-game-dev", "competitive-programming", "cybersecurity", "ssnhacks", "design-ui-ux", "full-stack", "open-source", "club"];

/** GET /api/posts/published?vertical=&slug= → the live article (from main) to load into the editor for an edit. */
export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vertical = request.nextUrl.searchParams.get("vertical") || "";
  const slug = request.nextUrl.searchParams.get("slug") || "";
  if (!VERTICALS.includes(vertical) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "Invalid article." }, { status: 400 });
  }
  const filePath = vertical === "club" ? `content/club/posts/${slug}.md` : `content/verticals/${vertical}/posts/${slug}.md`;
  try {
    const { data } = await getOctokit(token).repos.getContent({ owner: "blackscythe123", repo: "CC-Website-2026", path: filePath, ref: "main" });
    if (Array.isArray(data) || !("content" in data) || typeof data.content !== "string") throw Object.assign(new Error("Not found"), { status: 404 });
    const parsed = matter(Buffer.from(data.content, "base64").toString("utf-8"));
    const fm = parsed.data;
    return NextResponse.json({
      article: {
        vertical,
        slug,
        filePath,
        title: String(fm.title || slug),
        summary: String(fm.summary || ""),
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        coverImage: typeof fm.coverImage === "string" ? fm.coverImage : "",
        authorUsername: typeof fm.authorUsername === "string" ? fm.authorUsername : "",
        placement: vertical === "club" ? null : parsePlacement(fm.placement),
        markdownBody: parsed.content,
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status === 404) return NextResponse.json({ error: `"${slug}" isn't published in ${vertical}.` }, { status: 404 });
    console.error("Published article load error:", err);
    return NextResponse.json({ error: "Couldn't load the article from GitHub." }, { status: 502 });
  }
}
