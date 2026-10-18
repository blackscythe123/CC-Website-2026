import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import sanitizeHtml from "sanitize-html";

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
  const authorUsername = data.authorUsername || "";
  const authorAvatar = data.authorAvatar || (authorUsername ? `https://github.com/${authorUsername}.png` : "");
  const processed = await remark().use(html).process(content);
  const rawHtml = processed.toString();
  const contentHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "a", "b", "i", "strong", "em", "strike", "code", "hr", "br",
      "div", "table", "thead", "caption", "tbody", "tr", "th", "td",
      "pre", "blockquote", "ul", "ol", "li", "span", "img", "del", "sup", "sub"
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      code: ["class"],
      span: ["class"],
      div: ["class"],
      pre: ["class"],
      th: ["class"],
      td: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const rawHref = (attribs.href || "#").trim();
        const isSafe =
          rawHref.startsWith("#") ||
          (rawHref.startsWith("/") && !rawHref.startsWith("//")) ||
          rawHref.startsWith("https://") ||
          rawHref.startsWith("http://") ||
          rawHref.startsWith("mailto:");

        return {
          tagName: "a",
          attribs: {
            href: isSafe ? rawHref : "#",
            rel: "noopener noreferrer nofollow",
            target: attribs.target || "_blank",
            ...(attribs.title ? { title: attribs.title } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const src = (attribs.src || "").trim();
        const isSafe =
          src.startsWith("https://") ||
          src.startsWith("http://") ||
          (src.startsWith("/") && !src.startsWith("//"));

        if (!isSafe) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName: "img",
          attribs: {
            src,
            alt: attribs.alt || "",
            loading: "lazy",
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(attribs.width ? { width: attribs.width } : {}),
            ...(attribs.height ? { height: attribs.height } : {}),
          },
        };
      },
    },
    disallowedTagsMode: "discard",
  });

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
    contentHtml,
  };
}
