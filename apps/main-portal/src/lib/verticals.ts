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
  const monorepoVerticals = path.resolve(process.cwd(), "../../content/verticals");
  if (fs.existsSync(/* turbopackIgnore: true */ monorepoVerticals)) {
    return monorepoVerticals;
  }

  const rootVerticals = path.resolve(process.cwd(), "content/verticals");
  if (fs.existsSync(/* turbopackIgnore: true */ rootVerticals)) {
    return rootVerticals;
  }

  return monorepoVerticals;
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
