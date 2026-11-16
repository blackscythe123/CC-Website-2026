import { NextRequest, NextResponse } from "next/server";
import { TRACK_VERTICALS } from "@coding-club/content-schema/tracks";
import { getOctokit, listTracksOnMain, trackOutline } from "@/lib/github";
import { getSessionToken } from "@/lib/session";

/**
 * GET /api/tracks?vertical=<v> → { tracks: TrackOutline[] }
 * The vertical's learning tracks on main (titles, topic and subtopic ids), for the blog placement picker.
 * Track files are public content, so any signed-in user may read them.
 */
export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized. Please log in with GitHub." }, { status: 401 });

  const vertical = request.nextUrl.searchParams.get("vertical") || "";
  if (vertical === "club") return NextResponse.json({ tracks: [] });
  if (!TRACK_VERTICALS.includes(vertical)) {
    return NextResponse.json({ error: `Unknown vertical '${vertical}'.` }, { status: 400 });
  }
  try {
    const tracks = await listTracksOnMain(getOctokit(token), vertical);
    return NextResponse.json({ tracks: tracks.map((t) => trackOutline(t.slug, t.track)) });
  } catch (err) {
    console.error("Track list error:", err);
    return NextResponse.json({ error: "Couldn't load this vertical's tracks from GitHub." }, { status: 502 });
  }
}
