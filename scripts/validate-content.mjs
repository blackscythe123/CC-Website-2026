import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

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
});

const EventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  date: z.union([z.string(), z.date()]),
  location: z.string().optional(),
  description: z.string().optional(),
  registrationUrl: z.string().optional(),
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

for (const filePath of allPostFiles) {
  validatedCount++;
  const relativePath = path.relative(ROOT_DIR, filePath);
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
  const isEvent = relativePath.includes("events");
  const schemaResult = isEvent
    ? EventSchema.safeParse(parsed.data)
    : PostSchema.safeParse(parsed.data);

  if (!schemaResult.success) {
    hasErrors = true;
    for (const err of schemaResult.error.errors) {
      errors.push({
        file: relativePath,
        issue: `Frontmatter error at '${err.path.join(".")}': ${err.message}`,
      });
    }
  } else if (!isEvent) {
    const data = schemaResult.data;

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
    const verticalKey = data.vertical || "global";
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

  // Content body check
  if (!parsed.content || parsed.content.trim().length === 0) {
    hasErrors = true;
    errors.push({
      file: relativePath,
      issue: "Markdown body content is empty.",
    });
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
