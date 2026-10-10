import fs from "fs";
import path from "path";

export interface VerticalMetadata {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  color?: string;
  topics?: string[];
  lead: {
    name: string;
    role: string;
    github?: string;
    avatar?: string;
  };
}

function resolveVerticalsDir(): string {
  const candidate1 = path.resolve(process.cwd(), "../../content/verticals");
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.resolve(process.cwd(), "content/verticals");
  if (fs.existsSync(candidate2)) return candidate2;

  const candidate3 = path.resolve(__dirname, "../../../../../content/verticals");
  if (fs.existsSync(candidate3)) return candidate3;

  return candidate1;
}

export function getAllVerticals(): VerticalMetadata[] {
  const dir = resolveVerticalsDir();
  if (!fs.existsSync(dir)) return [];

  const folders = fs.readdirSync(dir);
  const verticals: VerticalMetadata[] = [];

  for (const folder of folders) {
    const metaPath = path.join(dir, folder, "metadata.json");
    if (fs.existsSync(metaPath)) {
      try {
        let raw = fs.readFileSync(metaPath, "utf8");
        raw = raw.replace(/^\uFEFF/, "").trim();
        const parsed = JSON.parse(raw);
        verticals.push({
          ...parsed,
          slug: parsed.slug || folder,
        });
      } catch (e) {
        console.error(`Error reading vertical metadata at ${metaPath}:`, e);
      }
    }
  }

  return verticals;
}

export function getVerticalBySlug(slug: string): VerticalMetadata | null {
  const all = getAllVerticals();
  return all.find((v) => v.slug === slug) || null;
}

export function getAllVerticalSlugs(): string[] {
  return getAllVerticals().map((v) => v.slug);
}
