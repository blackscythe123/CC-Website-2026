import { loadTrack, loadTracks, type LoadedTrack } from "@coding-club/content-render/server";
import { groupPlacedPosts, type PlacedPost } from "@coding-club/content-render";
import { placementLabel, type Placement } from "@coding-club/content-schema/tracks";
import portalConfig from "../../portal.config.json";
import { getPortalPosts, resolveContentDir } from "@/lib/posts";

/** This vertical's learning tracks (content/verticals/<vertical>/tracks/*.json). */
export function getTracks(): LoadedTrack[] {
  return loadTracks(resolveContentDir(), portalConfig.verticalSlug);
}

export function getTrack(slug: string): LoadedTrack | null {
  return loadTrack(resolveContentDir(), portalConfig.verticalSlug, slug);
}

/** Blogs placed in a track (via their frontmatter), grouped by topic/subtopic section. */
export function getPlacedPosts(loaded: LoadedTrack): Record<string, PlacedPost[]> {
  const posts = getPortalPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    date: p.date,
    href: `/posts/${p.slug}`,
    placement: p.placement,
  }));
  return groupPlacedPosts(posts, loaded.slug, loaded.track);
}

/** Breadcrumb for a placed blog: label + link to its section, or null if the placement doesn't resolve. */
export function getPlacementCrumb(placement: Placement | null): { label: string; href: string } | null {
  if (!placement) return null;
  const loaded = getTrack(placement.track);
  if (!loaded) return null;
  const label = placementLabel(placement, loaded.track);
  if (!label) return null;
  return { label, href: `/tracks/${loaded.slug}#t-${placement.subtopic || placement.topic}` };
}
