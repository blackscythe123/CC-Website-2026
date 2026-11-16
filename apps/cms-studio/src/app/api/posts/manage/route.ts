import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getUserRoleInfo, canDeletePost, getLiveClubRoles } from "@/lib/roles";
import {
  deletePublishedPost,
  listAllPublishedPostsFromGitHub,
} from "@/lib/github";
import { normalizeContentDate } from "@/lib/github";

import { getSessionToken } from "@/lib/session";

const ALL_VERTICALS = [
  "ai-ml",
  "ar-vr-game-dev",
  "competitive-programming",
  "cybersecurity",
  "ssnhacks",
  "design-ui-ux",
  "full-stack",
  "open-source",
];

interface PublishedPostItem {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  canDelete: boolean;
  /** May open an edit request (anyone with a role in that vertical; club posts: Superadmins). */
  canEdit: boolean;
}

function canEditPost(roleInfo: { role: string; rolesByVertical?: Record<string, string> }, vertical: string): boolean {
  if (roleInfo.role === "superadmin") return true;
  return vertical !== "club" && Boolean(roleInfo.rolesByVertical?.[vertical]);
}

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
    const liveRoles = await getLiveClubRoles(false, { token });
    const roleInfo = getUserRoleInfo(userData.login, liveRoles);

    // 1. Primary Source: Fetch live published posts tree directly from GitHub (Serverless/Vercel Safe)
    let gitHubPosts;
    try {
      gitHubPosts = await listAllPublishedPostsFromGitHub(token);
    } catch {
      return NextResponse.json({ error: "Couldn't load articles from GitHub right now. Please try again." }, { status: 502 });
    }

    if (gitHubPosts.length > 0) {
      const posts: PublishedPostItem[] = gitHubPosts.map((p) => ({
        slug: p.slug,
        vertical: p.vertical,
        title: p.title,
        date: p.date,
        author: p.author,
        summary: p.summary,
        canDelete: canDeletePost(userData.login, p.vertical, liveRoles),
        canEdit: canEditPost(roleInfo, p.vertical),
      }));

      return NextResponse.json({
        posts,
        roleInfo,
      });
    }

    // 2. Secondary Fallback: Local filesystem scan (for offline local development)
    const posts: PublishedPostItem[] = [];
    const contentBaseDir = path.resolve(process.cwd(), "../../content");
    const altContentBaseDir = path.resolve(process.cwd(), "content");
    const baseDir = fs.existsSync(contentBaseDir) ? contentBaseDir : altContentBaseDir;

    // Scan Club Announcements
    const clubPostsDir = path.join(baseDir, "club", "posts");
    if (fs.existsSync(clubPostsDir)) {
      const files = fs.readdirSync(clubPostsDir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(clubPostsDir, file), "utf-8");
          const { data } = matter(raw);
          const slug = file.replace(/\.md$/, "");
          posts.push({
            slug,
            vertical: "club",
            title: data.title || slug,
            date: normalizeContentDate(data.date),
            author: data.author || "SSN Coding Club",
            summary: data.summary || "",
            canDelete: canDeletePost(userData.login, "club", liveRoles),
            canEdit: canEditPost(roleInfo, "club"),
          });
        } catch {
          // ignore
        }
      }
    }

    // Scan Verticals
    for (const vert of ALL_VERTICALS) {
      const vertPostsDir = path.join(baseDir, "verticals", vert, "posts");
      if (fs.existsSync(vertPostsDir)) {
        const files = fs.readdirSync(vertPostsDir).filter((f) => f.endsWith(".md"));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(vertPostsDir, file), "utf-8");
            const { data } = matter(raw);
            const slug = file.replace(/\.md$/, "");
            posts.push({
              slug,
              vertical: vert,
              title: data.title || slug,
              date: normalizeContentDate(data.date),
              author: data.author || "Anonymous",
              summary: data.summary || "",
              canDelete: canDeletePost(userData.login, vert, liveRoles),
              canEdit: canEditPost(roleInfo, vert),
            });
          } catch {
            // ignore
          }
        }
      }
    }

    posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return NextResponse.json({
      posts,
      roleInfo,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load posts";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    let body: { vertical?: unknown; slug?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const vertical = typeof body.vertical === "string" ? body.vertical : "";
    const slug = typeof body.slug === "string" ? body.slug : "";

    if (!vertical || !slug) {
      return NextResponse.json(
        { error: "vertical and slug are required to unpublish an article." },
        { status: 400 }
      );
    }

    const validVerticals = [...ALL_VERTICALS, "club"];
    if (!validVerticals.includes(vertical)) {
      return NextResponse.json(
        { error: `Invalid technical vertical: '${vertical}'` },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid article slug format. Path traversal characters are strictly forbidden." },
        { status: 400 }
      );
    }

    // Permission enforcement:
    // Vertical Head can delete posts ONLY in their vertical.
    // Super Admin can delete posts in ANY vertical.
    // Deputies and Members cannot delete published posts.
    const isAllowed = canDeletePost(userData.login, vertical, await getLiveClubRoles(true, { token }));
    if (!isAllowed) {
      return NextResponse.json(
        {
          error: `Access Denied: Only the Vertical Head of '${vertical}' or a Superadmin can delete or unpublish this article.`,
        },
        { status: 403 }
      );
    }

    const result = await deletePublishedPost(token, vertical, slug, userData.login);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      pullNumber: result.pullNumber,
      prUrl: result.prUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete article";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
