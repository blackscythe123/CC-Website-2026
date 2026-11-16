// Server-only track loading (uses fs). Import from server components only:
//   import { loadTracks, loadTrack } from "@coding-club/content-render/server";
import fs from "node:fs";
import path from "node:path";
import { TRACK_SLUG_RE, validateTrack, type Track } from "@coding-club/content-schema/tracks";
import { parseCommentsConfig, type CommentsConfig } from "./index";

export interface LoadedTrack {
  slug: string;
  track: Track;
}

function tracksDir(contentRoot: string, vertical: string): string {
  return path.join(contentRoot, "verticals", vertical, "tracks");
}

function readTrack(contentRoot: string, vertical: string, slug: string): LoadedTrack | null {
  if (!TRACK_SLUG_RE.test(slug)) return null;
  const file = path.join(tracksDir(contentRoot, vertical), `${slug}.json`);
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  let json: unknown;
  const raw = fs.readFileSync(/* turbopackIgnore: true */ file, "utf8");
  try {
    json = JSON.parse(raw);
  } catch {
    console.warn(`[tracks] ${vertical}/${slug}.json is not valid JSON; skipped.`);
    return null;
  }
  // Post references are deliberately NOT checked here: CI blocks broken references, and the reader
  // shows "No longer available" for a missing post instead of failing the whole site build.
  const result = validateTrack(json, { vertical, slug, bytes: Buffer.byteLength(raw) });
  if (!result.ok || !result.track) {
    console.warn(`[tracks] ${vertical}/${slug}.json is invalid; skipped: ${result.errors.join("; ")}`);
    return null;
  }
  return { slug, track: result.track };
}

/** All valid tracks of one vertical, sorted by title. */
export function loadTracks(contentRoot: string, vertical: string): LoadedTrack[] {
  const dir = tracksDir(contentRoot, vertical);
  if (!fs.existsSync(/* turbopackIgnore: true */ dir)) return [];
  return fs
    .readdirSync(/* turbopackIgnore: true */ dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readTrack(contentRoot, vertical, f.slice(0, -5)))
    .filter((t): t is LoadedTrack => t !== null)
    .sort((a, b) => a.track.title.localeCompare(b.track.title));
}

export function loadTrack(contentRoot: string, vertical: string, slug: string): LoadedTrack | null {
  return readTrack(contentRoot, vertical, slug);
}

/**
 * Reader-comments config from content/club/comments.json. Returns null (comments off) when the file is
 * missing, invalid, or disabled — the site never fails to build because of it (CI validates the file).
 */
export function loadCommentsConfig(contentRoot: string): CommentsConfig | null {
  const file = path.join(contentRoot, "club", "comments.json");
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  try {
    const { config, errors } = parseCommentsConfig(JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")));
    if (errors.length) console.warn(`[comments] content/club/comments.json is invalid; comments are off: ${errors.join(" ")}`);
    return config && config.enabled && config.categoryId ? config : null;
  } catch {
    console.warn("[comments] content/club/comments.json is not valid JSON; comments are off.");
    return null;
  }
}
