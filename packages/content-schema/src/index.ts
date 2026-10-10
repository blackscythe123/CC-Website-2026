import { z } from "zod";

export const VALID_VERTICALS = [
  "ai-ml",
  "web-dev",
  "cybersecurity",
  "cloud-devops",
  "competitive-programming",
  "mobile-dev",
  "ui-ux",
  "blockchain",
  "iot-embedded",
  "game-dev",
  "club",
] as const;

export type VerticalSlug = (typeof VALID_VERTICALS)[number];

export const PostFrontmatterSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  date: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Date must follow YYYY-MM-DD format"),
      z.date(),
    ])
    .transform((val) => (val instanceof Date ? val.toISOString().split("T")[0] : val)),
  author: z.string().min(2, "Author must be at least 2 characters"),
  summary: z.string().optional().default(""),
  vertical: z
    .enum(VALID_VERTICALS, {
      errorMap: () => ({ message: "Must be a valid recognized vertical slug or 'club'" }),
    })
    .optional(),
  targetPortals: z
    .array(z.string())
    .optional()
    .default(["main-portal"]),
  tags: z.array(z.string()).optional().default([]),
  coverImage: z.string().optional().default(""),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export interface PortalConfig {
  id: string;
  name: string;
  slug: string;
  domain: string;
  appDir: string;
  isDefault: boolean;
  description: string;
}

/**
 * Checks whether an article is configured to render on a given portal ID.
 * Defaults to 'main-portal' for backwards compatibility with legacy posts.
 */
export function isPostVisibleOnPortal(
  frontmatter: { targetPortals?: string[] },
  portalId: string
): boolean {
  if (!frontmatter.targetPortals || frontmatter.targetPortals.length === 0) {
    // If not specified, default destination is the central main portal
    return portalId === "main-portal";
  }

  if (frontmatter.targetPortals.includes("*") || frontmatter.targetPortals.includes("all")) {
    return true;
  }

  return frontmatter.targetPortals.includes(portalId);
}

/**
 * Validates frontmatter object against the standardized contract.
 */
export function validatePostFrontmatter(input: unknown): {
  success: boolean;
  data?: PostFrontmatter;
  errors?: string[];
} {
  const result = PostFrontmatterSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
