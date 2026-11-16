// Learning-track schema (design v3.1): the single source of truth used by CI (scripts/validate-content.mjs),
// the vertical portals and CMS Studio. Plain ESM (.mjs) so Node scripts can import it directly.
//
// A track file holds topics → subtopics with resource items (links and YouTube videos). Blogs join a
// topic or subtopic only through their own frontmatter `placement` (see parsePlacement).
import { z } from "zod";

export const TRACK_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TRACK_SLUG_MAX = 60;
/** Topic/subtopic ids start with a letter so YAML can never read one as a number. */
export const SECTION_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const SECTION_ID_MAX = 40;
export const ITEM_ID_RE = /^[a-z0-9]{1,12}$/;
export const MAX_TRACK_ITEMS = 500;
export const MAX_TRACK_FILE_BYTES = 200 * 1024;
export const TRACK_VERTICALS = [
  "ai-ml",
  "ar-vr-game-dev",
  "competitive-programming",
  "cybersecurity",
  "ssnhacks",
  "design-ui-ux",
  "full-stack",
  "open-source",
];

const YT_VIDEO = /^[A-Za-z0-9_-]{11}$/;
const YT_LIST = /^[A-Za-z0-9_-]{10,64}$/;

/** Same rules as @coding-club/content-render parseYouTubeUrl (kept dependency-free for Node scripts). */
export function isYouTubeUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") return YT_VIDEO.test(url.pathname.slice(1));
  if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) return false;
  if (url.pathname === "/watch") return YT_VIDEO.test(url.searchParams.get("v") || "");
  if (url.pathname === "/playlist") return YT_LIST.test(url.searchParams.get("list") || "");
  return false;
}

function isSafeHttpsUrl(input) {
  if (typeof input !== "string" || input.length > 500) return false;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

const title = z.string().trim().min(1, "can't be empty").max(120, "is longer than 120 characters");
const itemId = z.string().regex(ITEM_ID_RE, "must be 1–12 lowercase letters or digits");
const sectionId = z
  .string()
  .max(SECTION_ID_MAX, `is longer than ${SECTION_ID_MAX} characters`)
  .regex(SECTION_ID_RE, "must be kebab-case and start with a letter");
const itemDescription = z.string().max(500, "is longer than 500 characters").optional();
const sectionDescription = z.string().max(1000, "is longer than 1000 characters").optional();

const LinkItem = z
  .object({
    id: itemId,
    type: z.literal("link"),
    title,
    url: z.string().refine(isSafeHttpsUrl, "must be an https link (no user:password)"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    description: itemDescription,
  })
  .strict();
const VideoItem = z
  .object({
    id: itemId,
    type: z.literal("video"),
    title,
    url: z.string().refine(isYouTubeUrl, "must be a YouTube video or playlist link"),
    description: itemDescription,
  })
  .strict();
const Item = z.discriminatedUnion("type", [LinkItem, VideoItem], {
  errorMap: (issue, ctx) =>
    issue.code === "invalid_union_discriminator"
      ? {
          message:
            'type must be "link" or "video" (blogs join a track through their own placement, not as items)',
        }
      : { message: ctx.defaultError },
});

const Subtopic = z
  .object({ id: sectionId, title, description: sectionDescription, items: z.array(Item).max(100).optional() })
  .strict();
const Topic = z
  .object({
    id: sectionId,
    title,
    description: sectionDescription,
    items: z.array(Item).max(100).optional(),
    subtopics: z.array(Subtopic).max(30).optional(),
  })
  .strict();

export const TrackSchema = z
  .object({
    title,
    summary: z.string().max(300, "is longer than 300 characters").default(""),
    vertical: z.enum(TRACK_VERTICALS),
    topics: z.array(Topic).min(1, "needs at least one topic").max(30),
  })
  .strict();

const PlacementSchema = z
  .object({
    track: z.string().max(TRACK_SLUG_MAX).regex(TRACK_SLUG_RE),
    topic: z.string().max(SECTION_ID_MAX).regex(SECTION_ID_RE),
    subtopic: z.string().max(SECTION_ID_MAX).regex(SECTION_ID_RE).optional(),
  })
  .strict();

/** Every resource item in reading order. */
export function trackItems(track) {
  const out = [];
  for (const topic of track.topics || []) {
    for (const item of topic.items || []) out.push(item);
    for (const sub of topic.subtopics || []) for (const item of sub.items || []) out.push(item);
  }
  return out;
}

/**
 * Validate a parsed track. Returns plain-language errors for authors.
 * @param {unknown} json parsed track file
 * @param {{ vertical: string, slug?: string, bytes?: number }} ctx
 */
export function validateTrack(json, ctx) {
  const errors = [];
  if (ctx.slug !== undefined && (!TRACK_SLUG_RE.test(ctx.slug) || ctx.slug.length > TRACK_SLUG_MAX)) {
    errors.push(`Track file name "${ctx.slug}" must be kebab-case and at most ${TRACK_SLUG_MAX} characters.`);
  }
  if (ctx.bytes !== undefined && ctx.bytes > MAX_TRACK_FILE_BYTES) {
    errors.push(`Track file is ${Math.round(ctx.bytes / 1024)} KB; the limit is ${MAX_TRACK_FILE_BYTES / 1024} KB.`);
  }
  const parsed = TrackSchema.safeParse(json);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const where = issue.path.length ? issue.path.join(".") : "track";
      errors.push(`${where} ${issue.message}`);
    }
    return { ok: false, errors, track: null };
  }
  const track = parsed.data;
  if (track.vertical !== ctx.vertical) {
    errors.push(`vertical is "${track.vertical}" but the file is in the "${ctx.vertical}" folder.`);
  }
  const sections = new Set();
  for (const topic of track.topics) {
    for (const id of [topic.id, ...(topic.subtopics || []).map((s) => s.id)]) {
      if (sections.has(id)) errors.push(`Topic/subtopic id "${id}" is used more than once in this track.`);
      sections.add(id);
    }
  }
  const items = trackItems(track);
  if (items.length > MAX_TRACK_ITEMS) errors.push(`Track has ${items.length} items; the limit is ${MAX_TRACK_ITEMS}.`);
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`Item id "${item.id}" is used more than once.`);
    seen.add(item.id);
  }
  return { ok: errors.length === 0, errors, track: errors.length === 0 ? track : null };
}

/** A blog's frontmatter placement, or null if absent or not exactly { track, topic, subtopic? }. */
export function parsePlacement(raw) {
  if (raw === undefined || raw === null) return null;
  const parsed = PlacementSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function findSection(track, placement) {
  const topic = track.topics.find((t) => t.id === placement.topic);
  if (!topic) return { topic: null, subtopic: null };
  if (!placement.subtopic) return { topic, subtopic: null };
  return { topic, subtopic: (topic.subtopics || []).find((s) => s.id === placement.subtopic) || null };
}

/**
 * Why a placement doesn't resolve (empty array = it does).
 * @param {{ track: string, topic: string, subtopic?: string }} placement
 * @param {{ vertical: string, tracks: Record<string, any> }} ctx tracks of that vertical, keyed by slug
 */
export function placementErrors(placement, ctx) {
  const track = ctx.tracks[placement.track];
  if (!track) return [`Track "${placement.track}" doesn't exist in ${ctx.vertical}.`];
  const { topic, subtopic } = findSection(track, placement);
  if (!topic) return [`Topic "${placement.topic}" doesn't exist in track "${placement.track}".`];
  if (placement.subtopic && !subtopic) {
    return [`Subtopic "${placement.subtopic}" doesn't exist under topic "${placement.topic}" in track "${placement.track}".`];
  }
  return [];
}

/** "DSA Sheet › Arrays & Hashing › Sliding window", or null if the placement doesn't resolve. */
export function placementLabel(placement, track) {
  const { topic, subtopic } = findSection(track, placement);
  if (!topic || (placement.subtopic && !subtopic)) return null;
  return [track.title, topic.title, subtopic?.title].filter(Boolean).join(" › ");
}
