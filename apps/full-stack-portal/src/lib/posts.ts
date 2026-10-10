import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import portalConfig from "../../portal.config.json";

export interface PortalPostSummary {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  coverImage?: string;
  tags: string[];
}

export interface PortalPostDetail extends PortalPostSummary {
  contentHtml: string;
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

export function getPortalPosts(): PortalPostSummary[] {
  const contentDir = resolveContentDir();
  const verticalSlug = portalConfig.verticalSlug;
  const targetPortalId = portalConfig.portalId;
  const postsDir = path.join(contentDir, "verticals", verticalSlug, "posts");
  const posts: PortalPostSummary[] = [];

  if (!fs.existsSync(postsDir)) {
    return posts;
  }

  const files = fs.readdirSync(postsDir);
  for (const file of files) {
    if (file.endsWith(".md")) {
      const filePath = path.join(postsDir, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data } = matter(raw);
      const slug = file.replace(/\.md$/, "");

      // Check targetPortals
      const targetPortals = Array.isArray(data.targetPortals) ? data.targetPortals : [];
      const isVisible =
        targetPortals.length === 0 ||
        targetPortals.includes(targetPortalId) ||
        targetPortals.includes("*") ||
        targetPortals.includes("all") ||
        targetPortals.includes("main-portal");

      if (isVisible) {
        posts.push({
          slug,
          vertical: verticalSlug,
          title: data.title || slug,
          date: data.date ? String(data.date).split("T")[0] : "",
          author: data.author || "Contributor",
          summary: data.summary || "",
          coverImage: data.coverImage || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      }
    }
  }

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPortalPost(slug: string): Promise<PortalPostDetail | null> {
  const contentDir = resolveContentDir();
  const verticalSlug = portalConfig.verticalSlug;
  const filePath = path.join(contentDir, "verticals", verticalSlug, "posts", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(html).process(content);

  return {
    slug,
    vertical: verticalSlug,
    title: data.title || slug,
    date: data.date ? String(data.date).split("T")[0] : "",
    author: data.author || "Contributor",
    summary: data.summary || "",
    coverImage: data.coverImage || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    contentHtml: processed.toString(),
  };
}
