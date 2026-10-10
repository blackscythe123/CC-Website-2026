import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const eventsDirectory = path.join(process.cwd(), "content/events");

export interface EventItem {
  slug: string;
  title: string;
  date: string;
  location: string;
  description: string;
  registrationUrl?: string;
  contentHtml?: string;
}

export function getAllEvents(): EventItem[] {
  if (!fs.existsSync(eventsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(eventsDirectory);
  const events = fileNames
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const fullPath = path.join(eventsDirectory, file);
      const content = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(content);

      return {
        slug,
        title: data.title || slug,
        date: data.date ? String(data.date) : "",
        location: data.location || "TBA",
        description: data.description || "",
        registrationUrl: data.registrationUrl || "",
      };
    });

  return events.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getEventBySlug(slug: string): Promise<EventItem | null> {
  const fullPath = path.join(eventsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const processed = await remark().use(html).process(content);

  return {
    slug,
    title: data.title || slug,
    date: data.date ? String(data.date) : "",
    location: data.location || "TBA",
    description: data.description || "",
    registrationUrl: data.registrationUrl || "",
    contentHtml: processed.toString(),
  };
}
