import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDirectory = path.join(process.cwd(), "content/posts");

export interface PostMetadata {
  slug: string;
  title: string;
  date: string;
  author?: string;
  summary?: string;
  coverImage?: string;
  tags?: string[];
}

export interface PostWithContent extends PostMetadata {
  contentHtml: string;
}

export function getAllPosts(): PostMetadata[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || slug,
        date: data.date ? String(data.date).split("T")[0] : new Date().toISOString().split("T")[0],
        author: data.author || "Coding Club",
        summary: data.summary || "",
        coverImage: data.coverImage || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    });

  return allPosts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<PostWithContent | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    title: data.title || slug,
    date: data.date ? String(data.date).split("T")[0] : new Date().toISOString().split("T")[0],
    author: data.author || "Coding Club",
    summary: data.summary || "",
    coverImage: data.coverImage || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    contentHtml,
  };
}
