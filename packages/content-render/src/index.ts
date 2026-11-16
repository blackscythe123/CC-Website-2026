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
const TOKEN_PREFIX = "CCEMBED";

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

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Replace each YouTube URL that sits alone on its own line (blank line or start/end of document on both
 * sides, outside fenced code) with a plain-text token. The token survives any markdown engine and
 * sanitizer as `<p>CCEMBEDn</p>`, and injectEmbeds swaps it for the player afterwards.
 */
export function extractEmbeds(markdown: string): { markdown: string; embeds: Embed[] } {
  const lines = markdown.split(/\r?\n/);
  const embeds: Embed[] = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(FENCE);
    if (f) {
      const marker = f[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const trimmed = line.trim();
    if (!trimmed || trimmed !== line.replace(/\s+$/, "")) continue; // indented lines are code / list continuation
    const prevBlank = i === 0 || lines[i - 1].trim() === "";
    const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === "";
    if (!prevBlank || !nextBlank) continue;
    const parsed = parseYouTubeUrl(trimmed);
    if (!parsed) continue;
    lines[i] = `${TOKEN_PREFIX}${embeds.length}`;
    embeds.push(parsed);
  }
  return { markdown: lines.join("\n"), embeds };
}

/**
 * Swap `<p>CCEMBEDn</p>` paragraphs for the player. Must run AFTER sanitizing, and its output must not
 * be sanitized again (that would strip the iframe). Unknown token numbers are left untouched.
 */
export function injectEmbeds(html: string, embeds: Embed[]): string {
  if (embeds.length === 0) return html;
  return html.replace(/<p>\s*CCEMBED(\d+)\s*<\/p>/g, (match, n: string) => {
    const e = embeds[Number(n)];
    const out = e ? youTubeEmbedHtml(e) : "";
    return out || match;
  });
}
