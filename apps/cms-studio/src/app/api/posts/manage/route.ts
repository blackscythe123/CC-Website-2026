import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getUserRoleInfo, canDeletePost } from "@/lib/roles";
import { deletePublishedPost } from "@/lib/github";

const ALL_VERTICALS = [
  "ai-ml",
  "web-dev",
  "cybersecurity",
  "cloud-devops",
  "competitive-programming",
  "mobile-dev",
  "ui-ux",
  "blockchain",
  "iot-embedded",
  "game-dev",
];

interface PublishedPostItem {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  canDelete: boolean;
}

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

    const posts: PublishedPostItem[] = [];
    const contentBaseDir = path.resolve(process.cwd(), "../../content");
    const altContentBaseDir = path.resolve(process.cwd(), "content");
    const baseDir = fs.existsSync(contentBaseDir) ? contentBaseDir : altContentBaseDir;

    // 1. Scan Club Announcements
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
            date: data.date || "",
            author: data.author || "SSN Coding Club",
            summary: data.summary || "",
            canDelete: canDeletePost(userData.login, "club"),
          });
        } catch {
          // ignore
        }
      }
    }

    // 2. Scan Verticals
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
              date: data.date || "",
              author: data.author || "Anonymous",
              summary: data.summary || "",
              canDelete: canDeletePost(userData.login, vert),
            });
          } catch {
            // ignore
          }
        }
      }
    }

    // Sort descending by date
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
    const { vertical, slug } = body;

    if (!vertical || !slug) {
      return NextResponse.json(
        { error: "vertical and slug are required to unpublish an article." },
        { status: 400 }
      );
    }

    // Permission enforcement:
    // Vertical Head can delete posts ONLY in their vertical.
    // Super Admin can delete posts in ANY vertical.
    // Deputies and Members cannot delete published posts.
    const isAllowed = canDeletePost(userData.login, vertical);
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
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete article";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
