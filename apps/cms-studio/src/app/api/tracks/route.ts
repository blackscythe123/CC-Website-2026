import { NextRequest, NextResponse } from "next/server";
import { TRACK_SLUG_MAX, TRACK_SLUG_RE, TRACK_VERTICALS, validateTrack } from "@coding-club/content-schema/tracks";
import {
  getOctokit,
  getPRDetails,
  listTracksOnMain,
  placedCountsOnMain,
  roleInVertical,
  submitTrackPullRequest,
  trackOutline,
} from "@/lib/github";
import { getLiveClubRoles, getUserRoleInfo } from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

/**
 * GET /api/tracks?vertical=<v>              → { tracks: TrackOutline[] }   (placement picker, track list)
 * GET /api/tracks?vertical=<v>&slug=<slug>  → { track, placedCounts }      (track editor)
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
    const octokit = getOctokit(token);
    const tracks = await listTracksOnMain(octokit, vertical);
    const slug = request.nextUrl.searchParams.get("slug");
    if (slug !== null) {
      const found = tracks.find((t) => t.slug === slug);
      if (!found) return NextResponse.json({ error: `There is no published track "${slug}" in ${vertical}.` }, { status: 404 });
      return NextResponse.json({ slug, track: found.track, placedCounts: await placedCountsOnMain(octokit, vertical, slug) });
    }
    return NextResponse.json({ tracks: tracks.map((t) => trackOutline(t.slug, t.track)) });
  } catch (err) {
    console.error("Track list error:", err);
    return NextResponse.json({ error: "Couldn't load this vertical's tracks from GitHub." }, { status: 502 });
  }
}

/**
 * POST /api/tracks { vertical, slug, track, mode: "create" | "edit", pullNumber?, expectedHeadSha? }
 *   → { pullNumber, prUrl, branch }
 * Opens (or revises) a learning-track pull request. Only the vertical's Head or a Superadmin may do this;
 * a Superadmin must approve it before it reaches main.
 */
export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized. Please log in with GitHub." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const vertical = typeof body.vertical === "string" ? body.vertical : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  const mode = body.mode;
  const pullNumber = body.pullNumber === undefined || body.pullNumber === null ? undefined : Number(body.pullNumber);
  const expectedHeadSha = typeof body.expectedHeadSha === "string" ? body.expectedHeadSha : undefined;

  if (!TRACK_VERTICALS.includes(vertical)) return NextResponse.json({ error: `Unknown vertical '${vertical}'.` }, { status: 400 });
  if (!TRACK_SLUG_RE.test(slug) || slug.length > TRACK_SLUG_MAX) {
    return NextResponse.json({ error: `The track's short name must be lowercase words joined by hyphens (max ${TRACK_SLUG_MAX} characters).` }, { status: 400 });
  }
  if (mode !== "create" && mode !== "edit" && mode !== "delete") {
    return NextResponse.json({ error: "mode must be 'create', 'edit' or 'delete'." }, { status: 400 });
  }
  if (pullNumber !== undefined && (!Number.isInteger(pullNumber) || pullNumber <= 0)) {
    return NextResponse.json({ error: "Invalid pullNumber." }, { status: 400 });
  }
  const raw = JSON.stringify(body.track ?? null);
  const checked =
    mode === "delete"
      ? { track: null, errors: [] as string[] }
      : validateTrack(body.track, { vertical, slug, bytes: Buffer.byteLength(raw) });
  if (mode !== "delete" && !checked.track) {
    return NextResponse.json({ error: checked.errors.slice(0, 5).join(" "), errors: checked.errors }, { status: 400 });
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "coding-club-cms-studio" },
    });
    if (!userRes.ok) return NextResponse.json({ error: "Invalid GitHub token." }, { status: 401 });
    const user = await userRes.json();
    const roleInfo = getUserRoleInfo(user.login, await getLiveClubRoles(true, { token }));
    const role = roleInVertical(roleInfo, vertical);
    if (role !== "vertical_head" && role !== "superadmin") {
      return NextResponse.json({ error: "Only the Vertical Head or a Superadmin can create or edit learning tracks." }, { status: 403 });
    }
    if (pullNumber !== undefined) {
      // Anti-IDOR: only the PR's own author (or a Superadmin) may push revisions into it.
      const pr = await getPRDetails(token, pullNumber);
      if ((pr.user?.login || "").toLowerCase() !== String(user.login).toLowerCase() && role !== "superadmin") {
        return NextResponse.json({ error: "You can't update a track proposal opened by someone else." }, { status: 403 });
      }
    }
    const result = await submitTrackPullRequest({
      token,
      authorUsername: user.login,
      authorDisplayName: user.name || user.login,
      vertical,
      slug,
      // delete mode never writes a track; validated tracks are required for create/edit (checked above)
      track: checked.track ?? { title: slug, summary: "", vertical, topics: [] },
      mode,
      pullNumber,
      expectedHeadSha,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "Couldn't save the track.";
    if (status && status >= 400 && status < 500) return NextResponse.json({ error: message }, { status });
    if (status === 503) return NextResponse.json({ error: message }, { status: 503 });
    console.error("Track submit error:", err);
    return NextResponse.json({ error: "Couldn't save the track to GitHub. Try again." }, { status: 500 });
  }
}
