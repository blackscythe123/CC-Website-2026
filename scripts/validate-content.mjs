import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { validateTrack, parsePlacement, placementErrors } from "../packages/content-schema/src/tracks.mjs";
import { parseCommentsConfig } from "../packages/content-schema/src/comments.mjs";

const ROOT_DIR = process.cwd();
const CONTENT_DIR = path.join(ROOT_DIR, "content");
const PORTALS_FILE = path.join(CONTENT_DIR, "club", "portals.json");

console.log("\n=======================================================");
console.log("🔍 SSN CODING CLUB - CONTENT CI VALIDATION SUITE");
console.log("=======================================================\n");

let hasErrors = false;
let validatedCount = 0;
const errors = [];

// 1. Validate Portals Registry
if (!fs.existsSync(PORTALS_FILE)) {
  console.error("❌ FATAL: portals.json not found at " + PORTALS_FILE);
  process.exit(1);
}

let registeredPortals = [];
try {
  registeredPortals = JSON.parse(fs.readFileSync(PORTALS_FILE, "utf-8"));
  console.log(`✓ Loaded Portals Registry: ${registeredPortals.length} portals registered.`);
  for (const portal of registeredPortals) {
    console.log(`   • [${portal.id}] -> ${portal.name} (${portal.domain})`);
  }
} catch (err) {
  console.error("❌ FATAL: Failed to parse portals.json:", err.message);
  process.exit(1);
}

const validPortalIds = new Set(registeredPortals.map((p) => p.id));
validPortalIds.add("*");
validPortalIds.add("all");

const VALID_VERTICALS = [
  "ai-ml",
  "ar-vr-game-dev",
  "competitive-programming",
  "cybersecurity",
  "ssnhacks",
  "design-ui-ux",
  "full-stack",
  "open-source",
  "club",
];

// 2. Frontmatter Validation Schemas
const PostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  date: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Date must follow YYYY-MM-DD format"),
      z.date(),
    ])
    .transform((val) => (val instanceof Date ? val.toISOString().split("T")[0] : val)),
  author: z.string().min(2, "Author must be at least 2 characters"),
  summary: z.string().optional().default(""),
  vertical: z.enum(VALID_VERTICALS).optional(),
  targetPortals: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  authorAvatar: z.string().optional(),
});

// Image URLs must be root-relative (e.g. /uploads/x.png) or absolute https.
// blob:/data: URLs are browser-local leftovers from CMS Studio and never resolve.
function isAllowedImageUrl(value) {
  const v = String(value).trim();
  if (v.startsWith("//")) return false;
  return v.startsWith("/uploads/") || v.startsWith("/") || v.startsWith("https://");
}
const EPHEMERAL_URL = /^\s*(blob:|data:)/i;
const MD_IMAGE_LINK = /!\[[^\]]*\]\(\s*<?\s*([^)\s>]+)/g;
const HTML_IMG_SRC = /<img\b[^>]*\bsrc\s*=\s*["']?\s*([^"'\s>]+)/gi;

// Real events directories (content/events and content/club/events).
const EVENTS_PATH = /^content\/(club\/)?events\//;
const SYNDICATION_PATH = /^content\/syndication\//;
const POSTS_DIR_PATH = /^content\/(verticals\/[^/]+\/|club\/)?posts\//;

const EventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  date: z.union([z.string(), z.date()]),
  location: z.string().optional(),
  description: z.string().optional(),
  registrationUrl: z.string().optional(),
});

const SyndicationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  sourceSlug: z.string().min(1, "sourceSlug is required"),
  author: z.string().min(2, "Author must be at least 2 characters"),
  date: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Date must follow YYYY-MM-DD format"),
      z.date(),
    ])
    .transform((val) => (val instanceof Date ? val.toISOString().split("T")[0] : val)),
  vertical: z.enum(VALID_VERTICALS).optional(),
  canonicalUrl: z.string().url().optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  platforms: z.array(z.string()).optional(),
});

// Helper to recursively find all markdown files in content directory
function findMarkdownFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findMarkdownFiles(fullPath));
    } else if (file.endsWith(".md") || file.endsWith(".mdx")) {
      results.push(fullPath);
    }
  }
  return results;
}

const allPostFiles = findMarkdownFiles(CONTENT_DIR);
console.log(`\nDiscovered ${allPostFiles.length} markdown post files in content/ directory.\n`);

const seenSlugsByVertical = new Map();

// Every folder under content/verticals must be a registered technical vertical.
const VERTICALS_DIR = path.join(CONTENT_DIR, "verticals");
const TECH_VERTICALS = VALID_VERTICALS.filter((v) => v !== "club");
if (fs.existsSync(VERTICALS_DIR)) {
  for (const entry of fs.readdirSync(VERTICALS_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !TECH_VERTICALS.includes(entry.name)) {
      hasErrors = true;
      errors.push({
        file: `content/verticals/${entry.name}`,
        issue: `Unknown vertical folder '${entry.name}'. Must be one of: [${TECH_VERTICALS.join(", ")}]`,
      });
    }
  }
}

for (const filePath of allPostFiles) {
  validatedCount++;
  const relativePath = path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
  const fileName = path.basename(filePath);
  const slug = fileName.replace(/\.mdx?$/, "");

  // Filename format check (kebab-case)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    hasErrors = true;
    errors.push({
      file: relativePath,
      issue: `Invalid filename format '${fileName}'. Slugs must be lowercase kebab-case (e.g. my-post-title.md).`,
    });
  }

  // Portals only read .md from posts directories; .mdx would be silently dropped.
  if (fileName.endsWith(".mdx") && POSTS_DIR_PATH.test(relativePath)) {
    hasErrors = true;
    errors.push({
      file: relativePath,
      issue: "'.mdx' files are not rendered by the portals. Rename to '.md'.",
    });
  }

  // Parse file content
  let rawContent;
  let parsed;
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
    parsed = matter(rawContent);
  } catch (err) {
    hasErrors = true;
    errors.push({
      file: relativePath,
      issue: `Failed to parse frontmatter or markdown: ${err.message}`,
    });
    continue;
  }

  // Schema Validation based on content type
  const isEvent = EVENTS_PATH.test(relativePath);
  const isSyndication = SYNDICATION_PATH.test(relativePath);
  const schemaResult = isEvent
    ? EventSchema.safeParse(parsed.data)
    : isSyndication
    ? SyndicationSchema.safeParse(parsed.data)
    : PostSchema.safeParse(parsed.data);

  if (!schemaResult.success) {
    hasErrors = true;
    for (const err of schemaResult.error.errors) {
      errors.push({
        file: relativePath,
        issue: `Frontmatter error at '${err.path.join(".")}': ${err.message}`,
      });
    }
  } else if (!isEvent && !isSyndication) {
    const data = schemaResult.data;

    // Image URL validation (coverImage, authorAvatar)
    for (const field of ["coverImage", "authorAvatar"]) {
      const value = data[field];
      if (value === undefined || value === null || String(value).trim() === "") continue;
      if (EPHEMERAL_URL.test(String(value)) || !isAllowedImageUrl(value)) {
        hasErrors = true;
        errors.push({
          file: relativePath,
          issue: `Invalid ${field} '${String(value).slice(0, 80)}'. Must start with '/uploads/', '/' (root-relative) or 'https://'; blob:/data: URLs are not allowed.`,
        });
      }
    }

    // Target Portals Validation
    if (data.targetPortals && data.targetPortals.length > 0) {
      for (const portalTarget of data.targetPortals) {
        if (!validPortalIds.has(portalTarget)) {
          hasErrors = true;
          errors.push({
            file: relativePath,
            issue: `Invalid targetPortal '${portalTarget}'. Must match one of: [${Array.from(validPortalIds).join(", ")}] defined in portals.json`,
          });
        }
      }
    }

    // Slug collision check within vertical
    const folderMatch = relativePath.match(/^content\/verticals\/([^/]+)\//);
    const verticalKey = folderMatch ? folderMatch[1] : relativePath.startsWith("content/club/") ? "club" : "global";
    if (data.vertical && data.vertical !== verticalKey) {
      hasErrors = true;
      errors.push({
        file: relativePath,
        issue: `Frontmatter vertical '${data.vertical}' does not match its folder '${verticalKey}'.`,
      });
    }
    if (!seenSlugsByVertical.has(verticalKey)) {
      seenSlugsByVertical.set(verticalKey, new Set());
    }
    const slugsInVertical = seenSlugsByVertical.get(verticalKey);
    if (slugsInVertical.has(slug)) {
      hasErrors = true;
      errors.push({
        file: relativePath,
        issue: `Duplicate post slug '${slug}' detected in vertical '${verticalKey}'.`,
      });
    } else {
      slugsInVertical.add(slug);
    }
  }

  // Body image links must not be browser-local blob:/data: URLs
  const body = parsed.content || "";
  for (const re of [MD_IMAGE_LINK, HTML_IMG_SRC]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body)) !== null) {
      if (EPHEMERAL_URL.test(m[1])) {
        hasErrors = true;
        errors.push({
          file: relativePath,
          issue: `Body image uses a blob:/data: URL ('${m[1].slice(0, 60)}'). Upload the image so it resolves to /uploads/...`,
        });
      }
    }
  }

  // Content body check
  if (!parsed.content || parsed.content.trim().length === 0) {
    hasErrors = true;
    errors.push({
      file: relativePath,
      issue: "Markdown body content is empty.",
    });
  }
}

// 2b. Learning tracks: content/verticals/<vertical>/tracks/<slug>.json (schema shared with portals + CMS)
let trackCount = 0;
const tracksByVertical = {};
if (fs.existsSync(VERTICALS_DIR)) {
  for (const vertical of TECH_VERTICALS) {
    const tracksDir = path.join(VERTICALS_DIR, vertical, "tracks");
    if (!fs.existsSync(tracksDir)) continue;
    const tracksOfVertical = (tracksByVertical[vertical] = {});
    for (const file of fs.readdirSync(tracksDir)) {
      const rel = `content/verticals/${vertical}/tracks/${file}`;
      if (!file.endsWith(".json") || fs.statSync(path.join(tracksDir, file)).isDirectory()) {
        hasErrors = true;
        errors.push({ file: rel, issue: "Only <track-slug>.json files are allowed in a tracks/ folder." });
        continue;
      }
      trackCount++;
      const raw = fs.readFileSync(path.join(tracksDir, file), "utf8");
      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        hasErrors = true;
        errors.push({ file: rel, issue: `Not valid JSON: ${e.message}` });
        continue;
      }
      const result = validateTrack(json, {
        vertical,
        slug: file.slice(0, -5),
        bytes: Buffer.byteLength(raw),
      });
      for (const issue of result.errors) {
        hasErrors = true;
        errors.push({ file: rel, issue });
      }
      if (result.track) tracksOfVertical[file.slice(0, -5)] = result.track;
    }
  }
}
console.log(`Validated ${trackCount} learning track file(s).`);

// 2c. Blog placements (frontmatter `placement: { track, topic, subtopic? }`).
//   - malformed placement, a placement on a club post, or a placed post hidden from its own portal → error
//   - a placement whose track/topic/subtopic doesn't exist → WARNING only, so a Head can still remove a
//     topic; such blogs just drop out of the tree until they are moved (readers ignore them).
const warnings = [];
for (const filePath of allPostFiles) {
  const rel = path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
  let data;
  try {
    ({ data } = matter(fs.readFileSync(filePath, "utf8")));
  } catch {
    continue; // already reported by the post checks above
  }
  if (data.placement === undefined || data.placement === null) continue; // a blank `placement:` means none
  const m = rel.match(/^content\/verticals\/([^/]+)\/posts\//);
  if (!m) {
    hasErrors = true;
    errors.push({ file: rel, issue: "Only vertical blogs can have a placement (club posts and other content can't)." });
    continue;
  }
  const vertical = m[1];
  const placement = parsePlacement(data.placement);
  if (!placement) {
    hasErrors = true;
    errors.push({
      file: rel,
      issue: "placement must be exactly { track, topic, subtopic? } with kebab-case values (topic ids start with a letter).",
    });
    continue;
  }
  const ownPortal = registeredPortals.find((p) => p.vertical === vertical)?.id;
  const targets = Array.isArray(data.targetPortals) ? data.targetPortals : [];
  if (ownPortal && targets.length > 0 && !targets.some((t) => t === ownPortal || t === "*" || t === "all")) {
    hasErrors = true;
    errors.push({
      file: rel,
      issue: `This blog is placed in a track but targetPortals doesn't include "${ownPortal}", so it would never show in the track.`,
    });
  }
  for (const w of placementErrors(placement, { vertical, tracks: tracksByVertical[vertical] || {} })) {
    warnings.push({ file: rel, issue: `${w} The blog won't appear in any track until its placement is fixed.` });
  }
}
for (const w of warnings) {
  console.warn(`⚠️  [${w.file}] ${w.issue}`);
}

// 2d. Reader comments: content/club/comments.json must be valid, and giscus.json (repo root) must allow
// every portal domain, or giscus refuses to load the widget there.
const COMMENTS_FILE = path.join(CONTENT_DIR, "club", "comments.json");
if (fs.existsSync(COMMENTS_FILE)) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf8"));
  } catch (e) {
    hasErrors = true;
    errors.push({ file: "content/club/comments.json", issue: `Not valid JSON: ${e.message}` });
  }
  if (raw !== undefined) {
    const { config, errors: problems } = parseCommentsConfig(raw);
    for (const issue of problems) {
      hasErrors = true;
      errors.push({ file: "content/club/comments.json", issue });
    }
    if (config?.enabled) {
      const giscusFile = path.join(ROOT_DIR, "giscus.json");
      let origins = [];
      try {
        origins = JSON.parse(fs.readFileSync(giscusFile, "utf8")).origins || [];
      } catch {
        origins = [];
      }
      for (const portal of registeredPortals) {
        if (!origins.includes(`https://${portal.domain}`)) {
          hasErrors = true;
          errors.push({
            file: "giscus.json",
            issue: `Comments are enabled but "https://${portal.domain}" (${portal.id}) is not in giscus.json origins, so comments wouldn't load there.`,
          });
        }
      }
    }
  }
}

// 3. Final Test Output
if (hasErrors) {
  console.error("❌ CI CONTENT VALIDATION FAILED WITH ERRORS:\n");
  for (const err of errors) {
    console.error(`  • [${err.file}]`);
    console.error(`    ↳ Error: ${err.issue}\n`);
  }
  console.error(`Failed ${errors.length} validation rule(s) across ${validatedCount} content files.`);
  process.exit(1);
} else {
  console.log("=======================================================");
  console.log(`✅ ALL CONTENT CI TESTS PASSED! (${validatedCount} files verified)`);
  console.log("✓ Frontmatter schema conforms to strict specification.");
  console.log("✓ Target portals correctly mapped to registry.");
  console.log("✓ Slugs follow lowercase kebab-case naming standard.");
  console.log("✓ No duplicate slugs or conflicting routes found.");
  console.log("=======================================================\n");
  process.exit(0);
}
