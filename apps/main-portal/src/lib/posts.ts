import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

export interface PostSummary {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  authorUsername?: string;
  authorAvatar?: string;
  summary: string;
  coverImage?: string;
  targetPortals?: string[];
  tags: string[];
}

export interface PostDetail extends PostSummary {
  contentHtml: string;
}

export function isPostVisibleOnPortal(
  targetPortals: string[] | undefined,
  portalId: string = "main-portal"
): boolean {
  if (!targetPortals || targetPortals.length === 0) return true;
  return (
    targetPortals.includes(portalId) ||
    targetPortals.includes("*") ||
    targetPortals.includes("all")
  );
}

function resolveContentDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "../../content"),
    path.resolve(process.cwd(), "content"),
    path.resolve(process.cwd(), "../content"),
    path.resolve(__dirname, "../../../../../content"),
    path.resolve(__dirname, "../../../../content"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function getAllPosts(portalId: string = "main-portal"): PostSummary[] {
  const contentDir = resolveContentDir();
  const verticalsDir = path.join(contentDir, "verticals");
  const posts: PostSummary[] = [];

  if (fs.existsSync(verticalsDir)) {
    const verticalFolders = fs.readdirSync(verticalsDir);

    for (const vFolder of verticalFolders) {
      const postsDir = path.join(verticalsDir, vFolder, "posts");
      if (fs.existsSync(postsDir)) {
        const fileNames = fs.readdirSync(postsDir);
        for (const file of fileNames) {
          if (file.endsWith(".md")) {
            const filePath = path.join(postsDir, file);
            const content = fs.readFileSync(filePath, "utf8");
            const { data } = matter(content);
            const slug = file.replace(/\.md$/, "");

            if (!isPostVisibleOnPortal(data.targetPortals, portalId)) {
              continue;
            }

            posts.push({
              slug,
              vertical: vFolder,
              title: data.title || slug,
              date: data.date ? String(data.date).split("T")[0] : "",
              author: data.author || "Club Member",
              authorUsername: data.authorUsername || "",
              authorAvatar: data.authorAvatar || (data.authorUsername ? `https://github.com/${data.authorUsername}.png` : ""),
              summary: data.summary || "",
              coverImage: data.coverImage || "",
              targetPortals: Array.isArray(data.targetPortals) ? data.targetPortals : ["main-portal"],
              tags: Array.isArray(data.tags) ? data.tags : [],
            });
          }
        }
      }
    }
  }

  // Also check club-wide posts
  const clubPostsDir = path.join(contentDir, "club", "posts");
  if (fs.existsSync(clubPostsDir)) {
    const fileNames = fs.readdirSync(clubPostsDir);
    for (const file of fileNames) {
      if (file.endsWith(".md")) {
        const filePath = path.join(clubPostsDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const { data } = matter(content);
        const slug = file.replace(/\.md$/, "");

        if (!isPostVisibleOnPortal(data.targetPortals, portalId)) {
          continue;
        }

        posts.push({
          slug,
          vertical: "club",
          title: data.title || slug,
          date: data.date ? String(data.date).split("T")[0] : "",
          author: data.author || "Coding Club Core",
          authorUsername: data.authorUsername || "",
          authorAvatar: data.authorAvatar || (data.authorUsername ? `https://github.com/${data.authorUsername}.png` : ""),
          summary: data.summary || "",
          coverImage: data.coverImage || "",
          targetPortals: Array.isArray(data.targetPortals) ? data.targetPortals : ["main-portal"],
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      }
    }
  }

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostsByVertical(verticalSlug: string): PostSummary[] {
  return getAllPosts().filter((p) => p.vertical === verticalSlug);
}

export async function getPost(
  verticalSlug: string,
  postSlug: string
): Promise<PostDetail | null> {
  const contentDir = resolveContentDir();
  let filePath = path.join(contentDir, "verticals", verticalSlug, "posts", `${postSlug}.md`);

  if (verticalSlug === "club") {
    filePath = path.join(contentDir, "club", "posts", `${postSlug}.md`);
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const processed = await remark().use(html).process(content);

  const authorUsername = data.authorUsername || "";
  const authorAvatar = data.authorAvatar || (authorUsername ? `https://github.com/${authorUsername}.png` : "");

  return {
    slug: postSlug,
    vertical: verticalSlug,
    title: data.title || postSlug,
    date: data.date ? String(data.date).split("T")[0] : "",
    author: data.author || "Club Member",
    authorUsername,
    authorAvatar,
    summary: data.summary || "",
    coverImage: data.coverImage || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    contentHtml: processed.toString(),
  };
}
