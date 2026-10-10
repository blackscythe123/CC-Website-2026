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
  summary: string;
  coverImage?: string;
  tags: string[];
}

export interface PostDetail extends PostSummary {
  contentHtml: string;
}

function resolveContentDir(): string {
  const candidate1 = path.resolve(process.cwd(), "../../content");
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.resolve(process.cwd(), "content");
  if (fs.existsSync(candidate2)) return candidate2;

  const candidate3 = path.resolve(__dirname, "../../../../../content");
  if (fs.existsSync(candidate3)) return candidate3;

  return candidate1;
}

export function getAllPosts(): PostSummary[] {
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

            posts.push({
              slug,
              vertical: vFolder,
              title: data.title || slug,
              date: data.date ? String(data.date).split("T")[0] : "",
              author: data.author || "Club Member",
              summary: data.summary || "",
              coverImage: data.coverImage || "",
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

        posts.push({
          slug,
          vertical: "club",
          title: data.title || slug,
          date: data.date ? String(data.date).split("T")[0] : "",
          author: data.author || "Coding Club Core",
          summary: data.summary || "",
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

  return {
    slug: postSlug,
    vertical: verticalSlug,
    title: data.title || postSlug,
    date: data.date ? String(data.date).split("T")[0] : "",
    author: data.author || "Club Member",
    summary: data.summary || "",
    coverImage: data.coverImage || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    contentHtml: processed.toString(),
  };
}
