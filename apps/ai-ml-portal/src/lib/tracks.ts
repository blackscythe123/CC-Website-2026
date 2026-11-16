import { loadTrack, loadTracks, type LoadedTrack } from "@coding-club/content-render/server";
import portalConfig from "../../portal.config.json";
import { getPortalPosts, resolveContentDir } from "@/lib/posts";
import type { TrackPostInfo } from "@coding-club/content-render/track-view";

/** This vertical's learning tracks (content/verticals/<vertical>/tracks/*.json). */
export function getTracks(): LoadedTrack[] {
  return loadTracks(resolveContentDir(), portalConfig.verticalSlug);
}

export function getTrack(slug: string): LoadedTrack | null {
  return loadTrack(resolveContentDir(), portalConfig.verticalSlug, slug);
}

/** Published posts a track may link to, keyed by slug. */
export function getTrackPosts(): Record<string, TrackPostInfo> {
  return Object.fromEntries(
    getPortalPosts().map((p) => [p.slug, { title: p.title, summary: p.summary, href: `/posts/${p.slug}` }])
  );
}
