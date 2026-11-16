import { vi, expect } from "vitest";
import { NextRequest } from "next/server";
import { FakeGitHub, OWNER } from "./fakeGithub";
import { normalizeClubRoles, setCachedRoles } from "@/lib/roles";

import * as draftRoute from "@/app/api/posts/draft/route";
import * as reviewsRoute from "@/app/api/posts/reviews/route";
import * as manageRoute from "@/app/api/posts/manage/route";
import * as rolesRoute from "@/app/api/roles/route";
import * as requestsRoute from "@/app/api/roles/requests/route";
import * as tracksRoute from "@/app/api/tracks/route";
import * as remoteDraftsRoute from "@/app/api/posts/drafts/remote/route";
import * as withdrawRoute from "@/app/api/posts/withdraw/route";
import * as restoreRoute from "@/app/api/posts/restore/route";
import * as publishedRoute from "@/app/api/posts/published/route";

const ROUTES: Record<string, Record<string, (r: NextRequest) => Promise<Response>>> = {
  "/api/posts/draft": draftRoute as never,
  "/api/posts/reviews": reviewsRoute as never,
  "/api/posts/manage": manageRoute as never,
  "/api/roles": rolesRoute as never,
  "/api/roles/requests": requestsRoute as never,
  "/api/tracks": tracksRoute as never,
  "/api/posts/drafts/remote": remoteDraftsRoute as never,
  "/api/posts/withdraw": withdrawRoute as never,
  "/api/posts/restore": restoreRoute as never,
  "/api/posts/published": publishedRoute as never,
};

// 1x1 transparent PNG
export const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const ROLES_PATH = "content/club/roles.json";
export const CODEOWNERS_PATH = ".github/CODEOWNERS";
export const UPLOADS = "apps/main-portal/public/uploads";

export const SEED_ROLES = {
  superadmins: ["sa1", "sa2"],
  vertical_heads: { "ai-ml": ["h1"], "full-stack": ["h2"] },
  deputies: { "ai-ml": ["d1", "d2"], "full-stack": ["d3"] },
  members: { "ai-ml": ["m1", "m2", "d3"] },
  pending_requests: [],
};
export const ROLE_USERS = ["sa1", "sa2", "h1", "h2", "d1", "d2", "d3", "m1", "m2"];
export const OUTSIDERS = ["x1", "x2"];

export function articleMd(o: { title: string; vertical: string; author: string; body?: string; cover?: string }) {
  return [
    "---",
    `title: ${o.title}`,
    "date: '2026-10-01'",
    `author: ${o.author}`,
    `authorUsername: ${o.author}`,
    `vertical: ${o.vertical}`,
    "tags: [x]",
    ...(o.cover ? [`coverImage: ${o.cover}`] : []),
    "---",
    o.body || "Body text.",
    "",
  ].join("\n");
}

export interface World {
  fake: FakeGitHub;
  /** Call a real route handler as `login`. */
  call: (login: string | null, method: string, path: string, body?: unknown) => Promise<{ status: number; json: any }>;
  /** Submit an article through POST /api/posts/draft. */
  submit: (login: string, o?: Partial<SubmitOpts>) => Promise<{ status: number; json: any; pull: number; branch: string }>;
  /** GET /api/posts/reviews as `login`, return the PR entry for `pull`. */
  listEntry: (login: string, pull: number) => Promise<any>;
  /** Review through POST /api/posts/reviews, defaulting expectedHeadSha to what GET list reports for the reviewer. */
  review: (
    login: string,
    pull: number,
    action: "approve" | "reject",
    o?: { sha?: string; reason?: string }
  ) => Promise<{ status: number; json: any }>;
  roles: (login: string, body: Record<string, unknown>) => Promise<{ status: number; json: any }>;
  rolesOnMain: () => any;
  mainTip: () => string;
}

export interface SubmitOpts {
  vertical: string;
  title: string;
  slug?: string;
  body: string;
  cover: boolean;
  pullNumber?: number;
  existingBranch?: string;
  pendingImages?: { filename: string; base64: string; placeholderUrl: string }[];
  markdownBody?: string;
  coverImage?: string;
  /** Sent only when the key is present (undefined = keep, null = none). */
  placement?: { track: string; topic: string; subtopic?: string } | null | Record<string, unknown>;
  /** Edit an already-published article (new PR, same vertical + slug). */
  editPublished?: boolean;
  /** Defaults to the PR's current head for revisions (what the editor loaded). */
  expectedHeadSha?: string;
}

export function makeWorld(): World {
  const fake = new FakeGitHub();
  for (const u of ROLE_USERS) fake.addUser(u, u.toUpperCase(), { collaborator: true });
  for (const u of OUTSIDERS) fake.addUser(u, u.toUpperCase());

  fake.seedMain({
    [ROLES_PATH]: JSON.stringify(normalizeClubRoles(SEED_ROLES), null, 2),
    [CODEOWNERS_PATH]: "* @sa1 @sa2\n",
    "content/verticals/ai-ml/posts/existing-ai-post.md": articleMd({ title: "Existing AI Post", vertical: "ai-ml", author: "h1" }),
    "content/verticals/full-stack/posts/existing-web-post.md": articleMd({ title: "Existing Web Post", vertical: "full-stack", author: "h2" }),
    "content/club/posts/welcome.md": articleMd({ title: "Welcome", vertical: "club", author: "sa1" }),
    [`${UPLOADS}/existing.png`]: Buffer.from(PNG_B64, "base64"),
  });

  fake.install(vi);
  vi.stubEnv("GITHUB_ADMIN_TOKEN", "");
  // Server-side token used only to merge a Head's/Superadmin's own request after all Studio checks pass.
  vi.stubEnv("CMS_PUBLISH_TOKEN", fake.tokenFor(OWNER));
  vi.stubEnv("GITHUB_PAT", "");
  vi.stubEnv("GITHUB_TOKEN", "");
  vi.stubEnv("SESSION_SECRET", "integration-test-secret");
  // the roles module keeps a 5 s in-process cache; start every world from the seeded roles
  setCachedRoles(normalizeClubRoles(SEED_ROLES));

  const call: World["call"] = async (login, method, path, body) => {
    const pathname = path.split("?")[0];
    const handler = ROUTES[pathname]?.[method];
    if (!handler) throw new Error(`harness: no handler for ${method} ${pathname}`);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (login) headers.authorization = `Bearer ${fake.tokenFor(login)}`;
    const req = new NextRequest(`http://localhost:3001${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = await handler(req);
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* empty */
    }
    return { status: res.status, json };
  };

  const submit: World["submit"] = async (login, o = {}) => {
    const withCover = o.cover ?? true;
    const placeholder = "blob:http://localhost:3001/cover-1";
    const body: Record<string, unknown> = {
      vertical: o.vertical ?? "ai-ml",
      title: o.title ?? "Intro to Transformers",
      slug: o.slug ?? (o.title ? undefined : "intro-to-transformers"),
      summary: "A summary",
      tags: ["ml"],
      markdownBody: o.markdownBody ?? `# Hello\n\n${o.body ?? "Original body."}${withCover ? `\n\n![cover](${placeholder})` : ""}`,
      coverImage: o.coverImage ?? (withCover ? placeholder : ""),
      pendingImages: o.pendingImages ?? (withCover ? [{ filename: "cover.png", base64: PNG_B64, placeholderUrl: placeholder }] : []),
      pullNumber: o.pullNumber,
      existingBranch: o.existingBranch,
      ...("placement" in o ? { placement: o.placement } : {}),
      ...(o.editPublished !== undefined ? { editPublished: o.editPublished } : {}),
      ...(o.pullNumber ? { expectedHeadSha: o.expectedHeadSha ?? fake.headSha(o.pullNumber) } : {}),
    };
    const r = await call(login, "POST", "/api/posts/draft", body);
    return { ...r, pull: r.json?.pullNumber, branch: r.json?.branch };
  };

  const listEntry: World["listEntry"] = async (login, pull) => {
    const r = await call(login, "GET", "/api/posts/reviews");
    expect(r.status).toBe(200);
    return (r.json.prs as any[]).find((p) => p.number === pull);
  };

  const review: World["review"] = async (login, pull, action, o = {}) => {
    let sha = o.sha;
    if (!sha) {
      const entry = await listEntry(login, pull);
      sha = entry?.headSha ?? fake.headSha(pull);
    }
    return call(login, "POST", "/api/posts/reviews", { pullNumber: pull, action, expectedHeadSha: sha, reason: o.reason });
  };

  return {
    fake,
    call,
    submit,
    listEntry,
    review,
    roles: (login, body) => call(login, "POST", "/api/roles", body),
    rolesOnMain: () => fake.readJson("main", ROLES_PATH),
    mainTip: () => fake.tip("main"),
  };
}

export { OWNER };
