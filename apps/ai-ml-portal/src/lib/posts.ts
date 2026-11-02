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

/**
 * gray-matter parses unquoted YAML dates (`date: 2026-10-10`) into JS Date
 * objects. Normalize both Date and string values to `YYYY-MM-DD`.
 */
export function normalizeDate(d: unknown): string {
  if (d === null || d === undefined || d === "") return "";
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return String(d).slice(0, 10);
}

const SAFE_SLUG = /^[a-z0-9-]+$/;

function isVisibleOnThisPortal(rawTargetPortals: unknown): boolean {
  const targetPortals: string[] = Array.isArray(rawTargetPortals) ? rawTargetPortals : [];
  return (
    targetPortals.length === 0 ||
    targetPortals.includes(portalConfig.portalId) ||
    targetPortals.includes("*") ||
    targetPortals.includes("all") ||
    targetPortals.includes("main-portal")
  );
}

function resolveContentDir(): string {
  const monorepoContent = path.resolve(process.cwd(), "../../content");
  if (fs.existsSync(/* turbopackIgnore: true */ monorepoContent)) {
    return monorepoContent;
  }

  const rootContent = path.resolve(process.cwd(), "content");
  if (fs.existsSync(/* turbopackIgnore: true */ rootContent)) {
    return rootContent;
  }

  return monorepoContent;
}

export function getPortalPosts(): PortalPostSummary[] {
  const contentDir = resolveContentDir();
  const verticalSlug = portalConfig.verticalSlug;
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

      if (isVisibleOnThisPortal(data.targetPortals)) {
        posts.push({
          slug,
          vertical: verticalSlug,
          title: data.title || slug,
          date: normalizeDate(data.date),
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
  if (!SAFE_SLUG.test(slug)) {
    return null;
  }

  const contentDir = resolveContentDir();
  const verticalSlug = portalConfig.verticalSlug;
  const filePath = path.join(contentDir, "verticals", verticalSlug, "posts", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  if (!isVisibleOnThisPortal(data.targetPortals)) {
    return null;
  }

  const processed = await remark().use(html).process(content);

  return {
    slug,
    vertical: verticalSlug,
    title: data.title || slug,
    date: normalizeDate(data.date),
    author: data.author || "Contributor",
    summary: data.summary || "",
    coverImage: data.coverImage || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    contentHtml: processed.toString(),
  };
}
