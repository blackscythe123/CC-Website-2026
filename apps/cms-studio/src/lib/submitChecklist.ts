export interface ChecklistItem {
  id: "title" | "body" | "vertical" | "summary" | "cover";
  label: string;
  level: "required" | "recommended" | "optional";
  ok: boolean;
  hint?: string;
}

export interface ChecklistInput {
  title: string;
  content: string;
  summary: string;
  coverImage: string;
  selectedVertical: string;
  allowedVerticals: string[];
  /** Revising a PR keeps its existing slug, so the title needn't produce one. */
  hasFixedSlug?: boolean;
}

/** The article slug the server derives from a title (POST /api/posts/draft): lowercase alphanumerics and hyphens. */
export function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

const BLOCKING_REASONS: Record<"title" | "slug" | "body" | "vertical", string> = {
  title: "Add a title (at least 3 characters) to submit",
  slug: "Title needs at least two letters or digits",
  body: "Write the article body to submit",
  vertical: "You need a vertical role to submit",
};

/** What the publish panel shows before a post can be submitted for review. */
export function getSubmitChecklist(input: ChecklistInput): {
  items: ChecklistItem[];
  canSubmit: boolean;
  blockingReason: string | null;
} {
  const items: ChecklistItem[] = [
    { id: "title", label: "Title", level: "required", ok: input.title.trim().length >= 3 && (input.hasFixedSlug || slugFromTitle(input.title).length >= 2), hint: "At least 3 characters, including two letters or digits" },
    { id: "body", label: "Article body", level: "required", ok: input.content.trim().length > 0 },
    {
      id: "vertical",
      label: "Vertical",
      level: "required",
      ok: input.allowedVerticals.includes(input.selectedVertical),
    },
    { id: "summary", label: "Summary", level: "recommended", ok: input.summary.trim().length > 0, hint: "Recommended for cards and sharing" },
    { id: "cover", label: "Cover image", level: "optional", ok: input.coverImage.length > 0, hint: "Optional" },
  ];

  const firstBlocking = items.find((i) => i.level === "required" && !i.ok);
  let blockingReason: string | null = null;
  if (firstBlocking) {
    const longEnough = input.title.trim().length >= 3;
    blockingReason =
      firstBlocking.id === "title" && longEnough ? BLOCKING_REASONS.slug : BLOCKING_REASONS[firstBlocking.id as "title" | "body" | "vertical"];
  }
  return { items, canSubmit: !firstBlocking, blockingReason };
}
