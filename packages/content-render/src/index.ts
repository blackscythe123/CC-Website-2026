/**
 * Shared, browser-safe content rendering helpers for every Coding Club app.
 * No Node or DOM APIs: the same code runs in the portals' build and in the CMS browser preview.
 *
 * YouTube embeds: a YouTube URL alone on its own line (its own paragraph, outside code fences)
 * becomes a player. Authors can never write iframes themselves (sanitizers strip them); the
 * player HTML is generated here, only from IDs that passed strict validation.
 */

export type Embed =
  | { kind: "video"; id: string; list?: string }
  | { kind: "playlist"; list: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{10,64}$/;
const WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

/** Parse a YouTube video / playlist / video-in-playlist URL. Returns null for anything else. */
export function parseYouTubeUrl(input: string): Embed | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const list = url.searchParams.get("list") || undefined;
  const validList = list && LIST_ID.test(list) ? list : undefined;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (!VIDEO_ID.test(id)) return null;
    return validList ? { kind: "video", id, list: validList } : { kind: "video", id };
  }
  if (!WATCH_HOSTS.has(host)) return null;

  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v") || "";
    if (!VIDEO_ID.test(id)) return null;
    return validList ? { kind: "video", id, list: validList } : { kind: "video", id };
  }
  if (url.pathname === "/playlist") {
    return validList ? { kind: "playlist", list: validList } : null;
  }
  return null;
}

/** The only iframe markup any Coding Club page ever renders for embeds. */
export function youTubeEmbedHtml(e: Embed): string {
  // IDs are re-validated here so this function is safe even if called directly.
  let src: string;
  if (e.kind === "playlist") {
    if (!LIST_ID.test(e.list)) return "";
    src = `https://www.youtube-nocookie.com/embed/videoseries?list=${e.list}`;
  } else {
    if (!VIDEO_ID.test(e.id)) return "";
    src = `https://www.youtube-nocookie.com/embed/${e.id}${e.list && LIST_ID.test(e.list) ? `?list=${e.list}` : ""}`;
  }
  return (
    `<div class="cc-embed"><iframe src="${src}" title="YouTube video player" loading="lazy" ` +
    `allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`
  );
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
// Raw HTML blocks whose content must never be touched, even across blank lines (CommonMark types 1 and 2).
const RAW_HTML_OPEN = /^ {0,3}<(pre|script|style|textarea)(?:\s|>|$)/i;
const COMMENT_OPEN = /^ {0,3}<!--/;

/** Embeds found in one document, tied to a random per-render token so author text can't forge one. */
export interface EmbedSet {
  token: string;
  items: Embed[];
}

function randomToken(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `CCEMBED${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}N`;
}

/**
 * Replace each YouTube URL that sits alone on its own line (blank line or start/end of document on both
 * sides, outside fenced code, indented code and raw HTML blocks) with a plain-text token. The token
 * survives any markdown engine and sanitizer as `<p>TOKENn</p>`; injectEmbeds swaps it for the player.
 */
export function extractEmbeds(markdown: string): { markdown: string; embeds: EmbedSet } {
  const lines = markdown.split(/\r?\n/);
  const embeds: EmbedSet = { token: randomToken(), items: [] };
  let fence: { char: string; len: number } | null = null;
  let rawEnd: RegExp | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (fence) {
      // CommonMark: the closing fence uses the same character, is at least as long, and has no info string.
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) fence = null;
      continue;
    }
    if (rawEnd) {
      if (rawEnd.test(line)) rawEnd = null;
      continue;
    }
    const open = line.match(FENCE_OPEN);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      fence = { char: open[1][0], len: open[1].length };
      continue;
    }
    const raw = line.match(RAW_HTML_OPEN);
    if (raw) {
      const end = new RegExp(`</${raw[1]}>`, "i");
      if (!end.test(line)) rawEnd = end;
      continue;
    }
    if (COMMENT_OPEN.test(line)) {
      if (!/-->/.test(line)) rawEnd = /-->/;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed !== line.replace(/\s+$/, "")) continue; // indented lines are code / list continuation
    const prevBlank = i === 0 || lines[i - 1].trim() === "";
    const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === "";
    if (!prevBlank || !nextBlank) continue;
    const parsed = parseYouTubeUrl(trimmed);
    if (!parsed) continue;
    lines[i] = `${embeds.token}${embeds.items.length}`;
    embeds.items.push(parsed);
  }
  return { markdown: lines.join("\n"), embeds };
}

/**
 * Swap `<p>TOKENn</p>` paragraphs for the player. Must run AFTER sanitizing, and its output must not
 * be sanitized again (that would strip the iframe). Anything that isn't this render's exact token is
 * left untouched.
 */
export function injectEmbeds(html: string, embeds: EmbedSet): string {
  if (embeds.items.length === 0) return html;
  const re = new RegExp(`<p>\\s*${embeds.token}(\\d{1,4})\\s*</p>`, "g");
  return html.replace(re, (match, n: string) => {
    const e = embeds.items[Number(n)];
    const out = e ? youTubeEmbedHtml(e) : "";
    return out || match;
  });
}

/** iframe src for an embed, or "" if the IDs are invalid (for React components that build the element). */
export function youTubeEmbedSrc(e: Embed): string {
  if (e.kind === "playlist") return LIST_ID.test(e.list) ? `https://www.youtube-nocookie.com/embed/videoseries?list=${e.list}` : "";
  if (!VIDEO_ID.test(e.id)) return "";
  return `https://www.youtube-nocookie.com/embed/${e.id}${e.list && LIST_ID.test(e.list) ? `?list=${e.list}` : ""}`;
}

// ---------------------------------------------------------------------------
// Learning-track progress (browser-only, no login): stored per site in localStorage.
// ---------------------------------------------------------------------------

export function trackProgressKey(vertical: string, slug: string): string {
  return `cc-track:v1:${vertical}/${slug}`;
}

/** Progress id of a placed blog (item ids never contain ":", so these can't collide). */
export function placedPostProgressId(slug: string): string {
  return `post:${slug}`;
}

/**
 * Parse stored progress. Unknown ids are KEPT (a blog briefly moved or a track edit must not erase
 * ticks); counting only looks at current ids. Corrupt or non-array data is treated as empty.
 */
export function parseTrackProgress(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 200).slice(0, 2000));
  } catch {
    return new Set();
  }
}

export function serializeTrackProgress(done: Set<string>): string {
  return JSON.stringify([...done].sort());
}

export function countDone(ids: string[], done: Set<string>): number {
  return ids.reduce((n, id) => n + (done.has(id) ? 1 : 0), 0);
}

// ---------------------------------------------------------------------------
// Blogs placed in a track (frontmatter `placement`), grouped per topic/subtopic.
// ---------------------------------------------------------------------------

export interface PlacementRef {
  track: string;
  topic: string;
  subtopic?: string;
}

/** A blog shown inside a track. Plain strings only, so it serialises to client components. */
export interface PlacedPost {
  slug: string;
  title: string;
  summary: string;
  date: string;
  href: string;
}

interface SectionTree {
  topics: { id: string; subtopics?: { id: string }[] }[];
}

/** Key of a topic ("arrays") or subtopic ("arrays/sliding-window") section. */
export function sectionKey(topicId: string, subtopicId?: string): string {
  return subtopicId ? `${topicId}/${subtopicId}` : topicId;
}

/**
 * Group posts placed in `trackSlug` by section. Placements pointing at a missing topic/subtopic are
 * dropped (the blog simply isn't shown in the tree). Order: date ascending (ISO strings; missing date
 * last), then slug.
 */
export function groupPlacedPosts(
  posts: (PlacedPost & { placement: PlacementRef | null })[],
  trackSlug: string,
  track: SectionTree
): Record<string, PlacedPost[]> {
  const valid = new Set<string>();
  for (const t of track.topics) {
    valid.add(sectionKey(t.id));
    for (const s of t.subtopics || []) valid.add(sectionKey(t.id, s.id));
  }
  const groups: Record<string, PlacedPost[]> = {};
  for (const post of posts) {
    const p = post.placement;
    if (!p || p.track !== trackSlug) continue;
    const key = sectionKey(p.topic, p.subtopic);
    if (!valid.has(key)) continue;
    (groups[key] ||= []).push({ slug: post.slug, title: post.title, summary: post.summary, date: post.date, href: post.href });
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => {
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? -1 : 1;
      }
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Reader comments (GitHub Discussions via giscus). Pure helpers; the widget is ./comments.
// ---------------------------------------------------------------------------

export interface CommentsConfig {
  enabled: boolean;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  disabledVerticals: string[];
}

const SAFE_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Discussion term (also the Discussion title) for a page. Stable across domains:
 *   post:<vertical|club>/<slug>, track:<vertical>/<track>, topic:<vertical>/<track>/<section-id>
 * Returns null for anything that isn't a safe kebab-case part.
 */
export function commentTerm(kind: "post" | "track" | "topic", ...parts: string[]): string | null {
  const expected = kind === "topic" ? 3 : 2;
  // Each part stays well under GitHub's 256-character Discussion title limit (older slugs exceed 80 chars).
  if (parts.length !== expected || !parts.every((p) => typeof p === "string" && p.length <= 120 && SAFE_PART.test(p))) return null;
  return `${kind}:${parts.join("/")}`;
}

export { parseCommentsConfig } from "@coding-club/content-schema/comments";

/** Whether comments should render for a vertical ("club" for club posts). */
export function commentsOn(config: CommentsConfig | null | undefined, vertical: string): config is CommentsConfig {
  return Boolean(config && config.enabled && config.categoryId && !config.disabledVerticals.includes(vertical));
}
