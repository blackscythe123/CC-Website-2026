// Learning-track schema: the single source of truth used by CI (scripts/validate-content.mjs),
// the vertical portals and CMS Studio. Plain ESM (.mjs) so Node scripts can import it directly.
import { z } from "zod";

export const TRACK_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TRACK_SLUG_MAX = 60;
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
const id = z.string().regex(/^[a-z0-9]{1,12}$/, "must be 1–12 lowercase letters or digits");

const PostItem = z.object({ id, type: z.literal("post"), slug: z.string().regex(TRACK_SLUG_RE, "must be a kebab-case post slug") }).strict();
const LinkItem = z
  .object({
    id,
    type: z.literal("link"),
    title,
    url: z.string().refine(isSafeHttpsUrl, "must be an https link (no user:password)"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })
  .strict();
const VideoItem = z
  .object({ id, type: z.literal("video"), title, url: z.string().refine(isYouTubeUrl, "must be a YouTube video or playlist link") })
  .strict();
const Item = z.discriminatedUnion("type", [PostItem, LinkItem, VideoItem]);

const Subtopic = z.object({ title, items: z.array(Item).min(1, "needs at least one item").max(100) }).strict();
const Topic = z
  .object({
    title,
    items: z.array(Item).max(100).optional(),
    subtopics: z.array(Subtopic).max(30).optional(),
  })
  .strict()
  .refine((t) => (t.items?.length ?? 0) + (t.subtopics?.length ?? 0) > 0, "needs items or subtopics");

export const TrackSchema = z
  .object({
    title,
    summary: z.string().max(300, "is longer than 300 characters").default(""),
    vertical: z.enum(TRACK_VERTICALS),
    topics: z.array(Topic).min(1, "needs at least one topic").max(30),
  })
  .strict();

/** Every item in reading order. */
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
 * @param {{ vertical: string, slug?: string, postSlugs?: Iterable<string>, bytes?: number }} ctx
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
  const items = trackItems(track);
  if (items.length > MAX_TRACK_ITEMS) errors.push(`Track has ${items.length} items; the limit is ${MAX_TRACK_ITEMS}.`);
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`Item id "${item.id}" is used more than once.`);
    seen.add(item.id);
  }
  if (ctx.postSlugs) {
    const posts = new Set(ctx.postSlugs);
    for (const item of items) {
      if (item.type === "post" && !posts.has(item.slug)) {
        errors.push(`Item "${item.id}" points to post "${item.slug}", which isn't published in ${ctx.vertical}.`);
      }
    }
  }
  return { ok: errors.length === 0, errors, track: errors.length === 0 ? track : null };
}
