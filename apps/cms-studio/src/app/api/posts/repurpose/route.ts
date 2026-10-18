import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionToken } from "@/lib/session";
import { generateRepurposePack } from "@/lib/repurposer";
import { Octokit } from "@octokit/rest";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const slug = searchParams.get("slug");

  if (!vertical || !slug) {
    return NextResponse.json(
      { error: "Both 'vertical' and 'slug' query parameters are required." },
      { status: 400 }
    );
  }

  try {
    let rawMarkdown = "";

    // 1. Try fetching directly from GitHub main branch
    try {
      const octokit = new Octokit({ auth: token });
      const filePath =
        vertical === "club"
          ? `content/club/posts/${slug}.md`
          : `content/verticals/${vertical}/posts/${slug}.md`;

      const { data } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePath,
        ref: "main",
      });

      if ("content" in data && data.content) {
        rawMarkdown = Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch {
      // GitHub fetch failed or offline, fall back to local disk
    }

    // 2. Fallback to local filesystem
    if (!rawMarkdown) {
      const contentBaseDir = path.resolve(process.cwd(), "../../content");
      const altContentBaseDir = path.resolve(process.cwd(), "content");
      const baseDir = fs.existsSync(contentBaseDir) ? contentBaseDir : altContentBaseDir;

      const localPath =
        vertical === "club"
          ? path.join(baseDir, "club", "posts", `${slug}.md`)
          : path.join(baseDir, "verticals", vertical, "posts", `${slug}.md`);

      if (fs.existsSync(localPath)) {
        rawMarkdown = fs.readFileSync(localPath, "utf-8");
      }
    }

    if (!rawMarkdown) {
      return NextResponse.json(
        { error: `Post '${slug}' in vertical '${vertical}' not found.` },
        { status: 404 }
      );
    }

    const pack = generateRepurposePack(rawMarkdown, slug, vertical);
    return NextResponse.json({ success: true, ...pack });
  } catch (err: unknown) {
    console.error("Repurpose API error:", err);
    const msg = err instanceof Error ? err.message : "Failed to repurpose article";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
