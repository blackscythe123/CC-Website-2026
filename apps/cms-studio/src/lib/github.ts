import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { parsePlacement, placementErrors, validateTrack, type Track } from "@coding-club/content-schema/tracks";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";
const MAIN_BRANCH = "main";

export function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export interface PendingImage {
  filename: string;
  base64: string;
  placeholderUrl: string;
}

export interface CreateDraftParams {
  token: string;
  authorUsername: string;
  authorDisplayName: string;
  vertical: string;
  slug: string;
  title: string;
  summary: string;
  coverImage?: string;
  targetPortals?: string[];
  tags: string[];
  markdownBody: string;
  pendingImages?: PendingImage[];
  pullNumber?: number;
  existingBranch?: string;
}

export interface DraftResult {
  pullNumber: number;
  prUrl: string;
  branch: string;
}

const ALLOWED_VERTICALS = [
  "ai-ml",
  "ar-vr-game-dev",
  "competitive-programming",
  "cybersecurity",
  "ssnhacks",
  "design-ui-ux",
  "full-stack",
  "open-source",
  "club",
];

/** Portal ids from content/club/portals.json. */
const VERTICAL_PORTAL_ID: Record<string, string> = {
  "ai-ml": "ai-ml-portal",
  "ar-vr-game-dev": "ar-vr-portal",
  "competitive-programming": "cp-portal",
  cybersecurity: "cybersecurity-portal",
  ssnhacks: "ssnhacks-portal",
  "design-ui-ux": "design-portal",
  "full-stack": "full-stack-portal",
  "open-source": "oss-portal",
};
const KNOWN_PORTAL_IDS = new Set(["main-portal", ...Object.values(VERTICAL_PORTAL_ID)]);

/**
 * Every article is always published on the main portal and on its own vertical portal; extra known
 * portals the client asked for are kept, unknown ids are dropped.
 */
export function resolveTargetPortals(vertical: string, requested?: string[]): string[] {
  const own = VERTICAL_PORTAL_ID[vertical];
  const extra = (requested || []).filter((id) => typeof id === "string" && KNOWN_PORTAL_IDS.has(id));
  return Array.from(new Set(["main-portal", ...(own ? [own] : []), ...extra]));
}

/** gray-matter turns unquoted YAML dates into Date objects; String(Date) is not YYYY-MM-DD. */
export function normalizeContentDate(d: unknown): string {
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  if (typeof d === "string") return d.slice(0, 10);
  return "";
}

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Throws if any pending image is not a real jpg/png/webp/gif within the size limit. */
export function assertSafePendingImages(pendingImages: PendingImage[] | undefined): void {
  for (const img of pendingImages || []) {
    if (!img || typeof img.filename !== "string" || typeof img.base64 !== "string") {
      throw new Error("Invalid image payload.");
    }
    if (!isSafePendingImage(img.filename, img.base64)) {
      throw new Error(
        `Image "${img.filename.slice(0, 60)}" was rejected: only JPG, PNG, WebP or GIF up to 3 MB are allowed. Remove or replace it and try again.`
      );
    }
  }
}

function isSafePendingImage(filename: string, base64: string): boolean {
  const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "";
  const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
  if (!allowed.includes(ext)) return false;

  const buf = Buffer.from(base64, "base64");
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return false;

  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isGif = buf.length > 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  const isWebp = buf.length > 12 && buf.toString("utf8", 0, 4) === "RIFF" && buf.toString("utf8", 8, 12) === "WEBP";

  return isJpeg || isPng || isGif || isWebp;
}

/**
 * blob:/data: URLs only exist in the author's browser. Every one in the body or cover must be backed
 * by an uploaded pending image, or the article would publish dead links. Returns the unresolved URLs.
 */
export function findUnresolvedLocalImageUrls(
  body: string,
  coverImage: string | undefined,
  pendingImages: { placeholderUrl?: string }[] | undefined
): string[] {
  const known = new Set((pendingImages || []).map((i) => i.placeholderUrl).filter(Boolean) as string[]);
  const found = new Set<string>();
  for (const m of body.matchAll(/(?:blob:https?:\/\/[^\s)"'<>]+|data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]{16})/g)) {
    if (m[0].startsWith("data:")) found.add("data:image/... (inline base64 image)");
    else if (!known.has(m[0])) found.add(m[0]);
  }
  const cover = (coverImage || "").trim();
  if ((cover.startsWith("blob:") && !known.has(cover)) || cover.startsWith("data:")) found.add(cover.slice(0, 80));
  return [...found];
}

export async function createDraftAndPullRequest(params: CreateDraftParams): Promise<DraftResult> {
  // Always act as the signed-in author. (A former fallback to a shared PAT silently made the PAT owner
  // the PR opener, which broke anti-self-review and revision ownership.)
  const octokit = getOctokit(params.token);
  const {
    authorUsername,
    authorDisplayName,
    vertical,
    slug,
    title,
    summary,
    targetPortals,
    tags,
    markdownBody,
    pendingImages,
    pullNumber,
    existingBranch,
  } = params;

  if (!ALLOWED_VERTICALS.includes(vertical)) {
    throw new Error(`Invalid technical vertical: '${vertical}'. Must be one of: ${ALLOWED_VERTICALS.join(", ")}`);
  }
  const unresolvedImages = findUnresolvedLocalImageUrls(markdownBody, params.coverImage, pendingImages);
  if (unresolvedImages.length > 0) {
    throw new Error(
      `Some images were never uploaded (${unresolvedImages.length}); they only exist in your browser. ` +
        "Re-add the cover image and any broken inline images, then submit again."
    );
  }
  // Reject bad images up front so nothing is written to GitHub (no half-created branches or dead links).
  assertSafePendingImages(pendingImages);

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filePath =
    vertical === "club"
      ? `content/club/posts/${cleanSlug}.md`
      : `content/verticals/${vertical}/posts/${cleanSlug}.md`;

  // Revisions must keep editing the PR's one existing article file (no second .md, no type crossover),
  // and must preserve the original author's byline.
  let preservedAuthor: { author?: unknown; authorUsername?: unknown; authorAvatar?: unknown; date?: unknown } | null = null;
  // A learning-track placement isn't edited by this form yet; carry it over so a revision never drops it.
  let preservedPlacement: unknown = undefined;
  if (pullNumber) {
    const prFiles = await octokit.paginate(octokit.pulls.listFiles, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
      per_page: 100,
    });
    const { data: prMeta } = await octokit.pulls.get({ owner: REPO_OWNER, repo: REPO_NAME, pull_number: pullNumber });
    const listingError = assertCompletePRListing(prMeta, prFiles.length);
    if (listingError) throw new Error(listingError);
    const check = validateArticlePRFiles(prFiles);
    if (!check.ok || check.kind !== "publish") {
      throw new Error(check.ok ? "This pull request is not an article submission." : check.error);
    }
    if (check.articlePath !== filePath) {
      throw new Error(
        `This revision would create a new file (${filePath}) instead of updating ${check.articlePath}. Keep the original vertical and slug.`
      );
    }
    try {
      const { data: existing } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePath,
        ref: existingBranch,
      });
      if (!Array.isArray(existing) && "content" in existing && typeof existing.content === "string") {
        const fm = matter(Buffer.from(existing.content, "base64").toString("utf-8")).data;
        preservedAuthor = { author: fm.author, authorUsername: fm.authorUsername, authorAvatar: fm.authorAvatar, date: fm.date };
        preservedPlacement = fm.placement;
      }
    } catch {
      // fall through: treated as the author's own first write
    }
  }

  if (!pullNumber) {
    // A new submission must not replace someone's published article (that would be an edit approved
    // under the submitter's quorum). Published articles are changed only by reviewed edit/unpublish PRs.
    try {
      await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: filePath, ref: MAIN_BRANCH });
      throw Object.assign(
        new Error(`An article called "${cleanSlug}" is already published in ${vertical}. Give your article a different title.`),
        { status: 409 }
      );
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
    }
  }

  let branchName = existingBranch;
  let createdBranch = false;

  // If this is a revision of an existing PR, reuse the existing branch!
  if (!branchName) {
    // 1. Get SHA of main branch head
    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${MAIN_BRANCH}`,
    });
    const mainSha = refData.object.sha;

    // 2. Create unique draft branch
    const timestamp = Date.now().toString().slice(-5);
    branchName = `draft/${vertical}/${cleanSlug}-${timestamp}`;

    try {
      await octokit.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `refs/heads/${branchName}`,
        sha: mainSha,
      });
      createdBranch = true;
    } catch (refErr: unknown) {
      const err = refErr as { status?: number; message?: string };
      throw new Error(
        err.status === 404 || err.status === 403
          ? `Repository write permission required on ${REPO_OWNER}/${REPO_NAME}. Please accept the GitHub collaborator invitation sent to @${authorUsername} or ask an admin to assign you.`
          : (err.message || "Failed to create draft branch on GitHub.")
      );
    }
  }

  try {

  // 3. Process and upload pending images ON THE DRAFT BRANCH
  let processedBody = markdownBody;
  let processedCoverImage = params.coverImage || "";

  if (pendingImages && pendingImages.length > 0) {
    for (const img of pendingImages) {
      const ext = img.filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "png";
      const base = img.filename.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 60) || "image";
      const cleanImgName = `${Date.now()}-${base}.${ext}`;
      const imgPath = `apps/main-portal/public/uploads/${cleanImgName}`;
      const permanentUrl = `/uploads/${cleanImgName}`;

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: imgPath,
        message: `chore(media): upload ${cleanImgName} on draft branch [skip vercel]`,
        content: img.base64,
        branch: branchName,
      });

      if (img.placeholderUrl) {
        processedBody = processedBody.replaceAll(img.placeholderUrl, permanentUrl);
        if (processedCoverImage === img.placeholderUrl) {
          processedCoverImage = permanentUrl;
        }
      }
    }
  }

  // Belt and braces: nothing browser-local may survive into the committed article.
  if (findUnresolvedLocalImageUrls(processedBody, processedCoverImage, []).length > 0) {
    throw new Error("An image could not be uploaded, so the article was not submitted. Re-add the images and try again.");
  }

  // 4. Prepare markdown frontmatter
  const today = new Date().toISOString().split("T")[0];
  const fileData = {
    title,
    date: (preservedAuthor?.date as string | undefined) || today,
    author: (preservedAuthor?.author as string | undefined) || authorDisplayName || authorUsername,
    authorUsername: (preservedAuthor?.authorUsername as string | undefined) || authorUsername,
    authorAvatar:
      (preservedAuthor?.authorAvatar as string | undefined) || `https://github.com/${authorUsername}.png`,
    summary,
    targetPortals: resolveTargetPortals(vertical, targetPortals),
    vertical,
    ...(processedCoverImage ? { coverImage: processedCoverImage } : {}),
    tags: tags && tags.length > 0 ? tags : [vertical],
    ...(vertical !== "club" && parsePlacement(preservedPlacement) ? { placement: parsePlacement(preservedPlacement) } : {}),
  };

  const fileContent = matter.stringify(processedBody, fileData);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  // Get existing file sha if updating an existing branch
  let existingFileSha: string | undefined;
  try {
    const { data: existingContent } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      ref: branchName,
    });
    if ("sha" in existingContent) {
      existingFileSha = existingContent.sha;
    }
  } catch {
    // New file
  }

  // 5. Commit file to draft branch
  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: filePath,
    message: pullNumber
      ? `fix(${vertical}): update revisions for PR #${pullNumber} [skip vercel]`
      : `feat(${vertical}): add ${cleanSlug} article [skip vercel]`,
    content: contentBase64,
    branch: branchName,
    sha: existingFileSha,
    author: {
      name: authorDisplayName || authorUsername,
      email: `${authorUsername}@users.noreply.github.com`,
    },
    committer: {
      name: "SSN Coding Club Studio",
      email: "bot@ssncodingclub.org",
    },
  });

  // If this is an existing PR, update its title/body and post a comment!
  if (pullNumber) {
    const { data: existingPr } = await octokit.pulls.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
    });

    await octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: pullNumber,
      body: `### 🚀 Revisions Pushed by Author (@${authorUsername})\nThe article has been updated in response to editorial feedback and is ready for re-review.`,
    });

    return {
      pullNumber,
      prUrl: existingPr.html_url,
      branch: branchName,
    };
  }

  // 6. Create brand new Pull Request
  const prTitle = `feat(${vertical}): ${title}`;
  const prBody = `## Overview
New article submission for the **${vertical}** technical vertical.

- **Title:** ${title}
- **Author:** ${authorDisplayName} (@${authorUsername})
- **Date:** ${today}
- **Summary:** ${summary}
${processedCoverImage ? `\n- **Cover Banner:** ![](${processedCoverImage})\n` : ""}

## Editorial Governance
- [x] Validated frontmatter schema
- [x] Isolated draft branch created
- [ ] Awaiting editorial review before merging into \`${MAIN_BRANCH}\``;

  const { data: prData } = await octokit.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title: prTitle,
    head: branchName,
    base: MAIN_BRANCH,
    body: prBody,
  });

  return {
    pullNumber: prData.number,
    prUrl: prData.html_url,
    branch: branchName,
  };
  } catch (err) {
    // Don't leave a half-written draft branch behind if anything after branch creation failed.
    if (createdBranch && branchName) {
      try {
        await octokit.git.deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${branchName}` });
      } catch {
        // best effort
      }
    }
    throw err;
  }
}

export interface PendingPR {
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  vertical: string;
  createdAt: string;
  htmlUrl: string;
  body: string;
  branch: string;
  /** The commit reviewers are looking at; approve/reject must echo it back. */
  headSha: string;
  /** Users whose latest decisive review approved THIS head commit. */
  approvers: string[];
  /** True only if feedback was given on the current head (cleared once the author pushes a revision). */
  changesRequested: boolean;
  latestFeedback: string;
  reviews: { user: string; state: string; body: string; date: string }[];
}

type ReviewLike = { user?: { login?: string } | null; state: string; commit_id?: string | null; body?: string | null; submitted_at?: string | null };

/** Latest decisive (APPROVED / CHANGES_REQUESTED / DISMISSED) review per user, on the given head commit. */
export function summarizeReviewsForHead(reviews: ReviewLike[], headSha: string) {
  const latest = new Map<string, ReviewLike>();
  for (const r of reviews) {
    const u = r.user?.login?.toLowerCase();
    if (!u) continue;
    if (r.state !== "APPROVED" && r.state !== "CHANGES_REQUESTED" && r.state !== "DISMISSED") continue;
    latest.set(u, r);
  }
  const approvers: string[] = [];
  let changesRequested = false;
  let latestFeedback = "";
  for (const [u, r] of latest) {
    if (r.commit_id !== headSha) continue;
    if (r.state === "APPROVED") approvers.push(u);
    if (r.state === "CHANGES_REQUESTED") {
      changesRequested = true;
      latestFeedback = r.body || latestFeedback;
    }
  }
  return { approvers, changesRequested, latestFeedback };
}

export async function listPendingReviewPRs(token: string): Promise<PendingPR[]> {
  const octokit = getOctokit(token);
  // Paginated: the default page of 30 used to hide older PRs from the queue entirely.
  const pulls = await octokit.paginate(octokit.pulls.list, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: "open",
    base: MAIN_BRANCH,
    sort: "created",
    direction: "desc",
    per_page: 100,
  });

  return Promise.all(
    pulls.map(async (pr) => {
      // Display-only hint; authorization always re-derives the vertical from the article file path.
      const branchMatch = pr.head.ref.match(/^(?:draft|cms)\/([a-z0-9_-]+)\//);
      const titleMatch = pr.title.match(/^(?:feat|chore)\(([a-z0-9-]+)\)/);
      const vertical = (branchMatch?.[1] || titleMatch?.[1] || "general").toLowerCase();

      let reviewsList: PendingPR["reviews"] = [];
      let summary = { approvers: [] as string[], changesRequested: false, latestFeedback: "" };
      try {
        const reviews = await octokit.paginate(octokit.pulls.listReviews, {
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pr.number,
          per_page: 100,
        });
        reviewsList = reviews.map((r) => ({
          user: r.user?.login || "unknown",
          state: r.state,
          body: r.body || "",
          date: r.submitted_at || "",
        }));
        summary = summarizeReviewsForHead(reviews, pr.head.sha);

        // Feedback comments only count if they were posted after the current head commit.
        if (!summary.changesRequested) {
          const [{ data: headCommit }, comments] = await Promise.all([
            octokit.repos.getCommit({ owner: REPO_OWNER, repo: REPO_NAME, ref: pr.head.sha }),
            octokit.paginate(octokit.issues.listComments, {
              owner: REPO_OWNER,
              repo: REPO_NAME,
              issue_number: pr.number,
              per_page: 100,
            }),
          ]);
          const headDate = Date.parse(headCommit.commit.committer?.date || headCommit.commit.author?.date || "") || 0;
          const feedback = comments.filter(
            (c) => c.body?.includes("Editorial Feedback & Rejection") && Date.parse(c.created_at) > headDate
          );
          if (feedback.length > 0) {
            const last = feedback[feedback.length - 1];
            summary.changesRequested = true;
            summary.latestFeedback =
              (last.body || "")
                .replace(/###\s*📝\s*Editorial Feedback & Rejection/i, "")
                .replace(/\*\*Reviewer:\*\*\s*@[\w-]+/i, "")
                .trim() || "Revisions requested by editorial reviewer.";
          }
        }
      } catch (err) {
        console.warn(`Could not fetch reviews for PR #${pr.number}:`, err);
      }

      return {
        number: pr.number,
        title: pr.title.replace(/^\[.*?\]\s*/, ""),
        author: pr.user?.login || "unknown",
        authorAvatar: pr.user?.avatar_url || "",
        vertical,
        createdAt: pr.created_at,
        htmlUrl: pr.html_url,
        body: pr.body || "",
        branch: pr.head.ref,
        headSha: pr.head.sha,
        approvers: summary.approvers,
        changesRequested: summary.changesRequested,
        latestFeedback: summary.latestFeedback,
        reviews: reviewsList,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Editorial governance helpers (pure, unit-tested)
// ---------------------------------------------------------------------------

const ARTICLE_PATH_RE = /^content\/(?:verticals\/([a-z0-9-]+)|(club))\/posts\/([a-z0-9-]+)\.md$/;
// Only raster images, never HTML/SVG/JS that would be served from the portal's origin.
const UPLOAD_PATH_RE = /^apps\/main-portal\/public\/uploads\/[A-Za-z0-9_-][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/;
const EDITORIAL_VERTICALS = new Set(ALLOWED_VERTICALS);

/** A CMS PR is one article plus a handful of images; anything bigger is refused outright. */
export const MAX_EDITORIAL_PR_FILES = 40;
const MAX_PR_COMMITS = 200;

/**
 * GitHub's "list PR files" stops at 3,000 entries and "list PR commits" at 250. Validating a truncated
 * list would let extra files (e.g. roles.json) ride along unseen, so the lists must be complete.
 */
export function assertCompletePRListing(
  pr: { changed_files?: number; commits?: number },
  filesSeen: number,
  commitsSeen?: number
): string | null {
  if (typeof pr.changed_files !== "number" || pr.changed_files !== filesSeen) {
    return "This pull request's file list could not be fully verified.";
  }
  if (filesSeen > MAX_EDITORIAL_PR_FILES) {
    return `This pull request changes ${filesSeen} files; CMS articles may change at most ${MAX_EDITORIAL_PR_FILES}.`;
  }
  if (commitsSeen !== undefined) {
    if (typeof pr.commits !== "number" || pr.commits !== commitsSeen || commitsSeen > MAX_PR_COMMITS) {
      return "This pull request's commit history could not be fully verified.";
    }
  }
  return null;
}

export type PRFileCheck =
  | { ok: true; kind: "publish" | "unpublish"; articlePath: string; vertical: string; articleStatus?: string }
  | { ok: false; error: string };

type PRFile = string | { filename: string; status?: string };

/**
 * A CMS editorial PR is exactly one of:
 *  - publish:   one added/modified article file plus newly *added* upload images, nothing else;
 *  - unpublish: one removed article file and nothing else.
 * Anything else (code, workflows, roles.json, renames, replaced uploads, two articles) is refused.
 */
export function validateArticlePRFiles(files: PRFile[]): PRFileCheck {
  const list = files.map((f) => (typeof f === "string" ? { filename: f, status: undefined } : f));
  const articles = list.filter((f) => ARTICLE_PATH_RE.test(f.filename));
  const uploads = list.filter((f) => UPLOAD_PATH_RE.test(f.filename));
  const others = list.filter((f) => !ARTICLE_PATH_RE.test(f.filename) && !UPLOAD_PATH_RE.test(f.filename));
  if (others.length > 0) {
    return {
      ok: false,
      error: `PR modifies files outside article content and uploads: ${others.slice(0, 5).map((f) => f.filename).join(", ")}`,
    };
  }
  if (articles.length !== 1) {
    return { ok: false, error: `PR must contain exactly one article file (found ${articles.length}).` };
  }
  const article = articles[0];
  const m = article.filename.match(ARTICLE_PATH_RE)!;
  const vertical = m[1] || m[2];
  if (!EDITORIAL_VERTICALS.has(vertical)) {
    return { ok: false, error: `Unknown vertical '${vertical}' in ${article.filename}.` };
  }
  if (article.status === "renamed") {
    return { ok: false, error: "Renaming articles is not supported through the CMS." };
  }
  const notAdded = uploads.filter((u) => u.status !== undefined && u.status !== "added");
  if (notAdded.length > 0) {
    return { ok: false, error: `PR changes or removes existing uploads: ${notAdded.map((u) => u.filename).join(", ")}` };
  }
  if (article.status === "removed") {
    if (uploads.length > 0) return { ok: false, error: "An unpublish request may only remove the article." };
    return { ok: true, kind: "unpublish", articlePath: article.filename, vertical, articleStatus: article.status };
  }
  return { ok: true, kind: "publish", articlePath: article.filename, vertical, articleStatus: article.status };
}

export type EditorialRole = "superadmin" | "vertical_head" | "deputy" | "member" | "none";

export function editorialRank(r: EditorialRole): number {
  return { none: 0, member: 1, deputy: 2, vertical_head: 3, superadmin: 4 }[r] ?? 0;
}

/** Role of a user *in a specific vertical*; superadmin applies everywhere. */
export function roleInVertical(
  info: { role: string; rolesByVertical?: Record<string, string> },
  vertical: string
): EditorialRole {
  if (info.role === "superadmin") return "superadmin";
  const r = info.rolesByVertical?.[vertical];
  return (r as EditorialRole) || "none";
}

/**
 * Quorum rules (CLAUDE.md):
 *  - Member article:     2 Deputies OR 1 Vertical Head OR 1 Superadmin
 *  - Deputy article:     1 Vertical Head OR 1 Superadmin
 *  - Head article:       1 Superadmin
 *  - Superadmin article: another Superadmin
 * Returns "merge", "count-deputies", or an error message.
 */
export function evaluateReviewerAuthority(
  reviewerRole: EditorialRole,
  authorRole: EditorialRole
): "merge" | "count-deputies" | string {
  if (reviewerRole === "superadmin") return "merge";
  if (reviewerRole === "vertical_head") {
    if (authorRole === "member" || authorRole === "deputy" || authorRole === "none") return "merge";
    return `Articles by a ${authorRole} must be approved by a Superadmin.`;
  }
  if (reviewerRole === "deputy") {
    if (authorRole === "member" || authorRole === "none") return "count-deputies";
    return `Articles by a ${authorRole} must be approved by the Vertical Head or a Superadmin.`;
  }
  return "You are not authorized to review articles in this vertical.";
}

/** Distinct deputies whose latest decisive review approves the given head commit. */
export function countDeputyApprovals(
  reviews: { user?: { login?: string } | null; state: string; commit_id?: string | null }[],
  headSha: string,
  deputyUsernames: string[],
  excludeUsers: string[]
): number {
  const deputies = new Set(deputyUsernames.map((d) => d.toLowerCase()));
  const excluded = new Set(excludeUsers.map((u) => u.toLowerCase()));
  const latest = new Map<string, { state: string; commit: string | null | undefined }>();
  for (const r of reviews) {
    const u = r.user?.login?.toLowerCase();
    if (!u || excluded.has(u)) continue;
    if (r.state !== "APPROVED" && r.state !== "CHANGES_REQUESTED" && r.state !== "DISMISSED") continue;
    latest.set(u, { state: r.state, commit: r.commit_id });
  }
  let n = 0;
  for (const [u, v] of latest) {
    if (deputies.has(u) && v.state === "APPROVED" && v.commit === headSha) n++;
  }
  return n;
}

export async function getPRDetails(token: string, pullNumber: number) {
  const octokit = getOctokit(token);
  const { data: prData } = await octokit.pulls.get({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: pullNumber,
  });
  return prData;
}

export async function getPRArticleContent(token: string, pullNumber: number) {
  const octokit = getOctokit(token);
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: pullNumber,
    per_page: 100,
  });

  const check = validateArticlePRFiles(files);
  if (!check.ok) {
    throw new Error(check.error);
  }
  const mdFile = { filename: check.articlePath };

  const { data: prData } = await octokit.pulls.get({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: pullNumber,
  });

  // An unpublish request deletes the file on its branch, so show the article as it is live on the base.
  const { data: fileRes } = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: mdFile.filename,
    ref: check.kind === "unpublish" ? prData.base.sha : prData.head.sha,
  });

  if ("content" in fileRes && typeof fileRes.content === "string") {
    const raw = Buffer.from(fileRes.content, "base64").toString("utf-8");
    const parsed = matter(raw);
    const fmVertical = typeof parsed.data.vertical === "string" ? parsed.data.vertical.toLowerCase() : "";
    if (fmVertical && fmVertical !== check.vertical) {
      throw new Error(`Frontmatter vertical '${fmVertical}' does not match file location '${check.vertical}'.`);
    }
    return {
      filePath: mdFile.filename,
      frontmatter: parsed.data,
      markdownBody: parsed.content,
      branch: prData.head.ref,
      title: (parsed.data.title as string) || prData.title,
      coverImage: (parsed.data.coverImage as string) || "",
      summary: (parsed.data.summary as string) || "",
      tags: (parsed.data.tags as string[]) || [],
      vertical: check.vertical,
      author: (parsed.data.author as string) || prData.user?.login || "unknown",
      authorUsername: typeof parsed.data.authorUsername === "string" ? parsed.data.authorUsername : "",
      headSha: prData.head.sha,
      pullNumber,
    };
  }

  throw new Error("Could not read draft file content.");
}

export interface ReviewOptions {
  token: string;
  pullNumber: number;
  reviewerUsername: string;
  /** Reviewer's role in the PR's vertical (see roleInVertical). */
  reviewerRole: string;
  targetVertical: string;
  /** PR author's role in the PR's vertical. */
  authorRole: string;
  deputyUsernames?: string[];
  /** authorUsername from the article frontmatter (excluded from reviewing). */
  articleAuthorUsername?: string;
  /** The head commit the reviewer actually looked at. Required: approvals never land on unseen changes. */
  expectedHeadSha: string;
  /** Article title from the frontmatter, used for the squash-merge subject. */
  articleTitle?: string;
  /** Resolves a user's role in targetVertical (used when an existing article is being edited). */
  roleOf?: (login: string) => EditorialRole;
}
export type ApproveAndMergeOptions = ReviewOptions;

type ReviewCheck =
  | { ok: false; status: number; message: string }
  | {
      ok: true;
      headSha: string;
      headBranch: string;
      prAuthor: string;
      contributors: Set<string>;
      decision: "merge" | "count-deputies";
      kind: "publish" | "unpublish";
      articlePath: string;
    };

const REVIEWABLE_BRANCH_RE = /^(?:draft|cms)\/[a-z0-9_-]+\/[a-z0-9-]+$/;

/** Everything both "approve" and "request changes" must satisfy before touching GitHub. */
async function checkReviewPreconditions(octokit: Octokit, o: ReviewOptions): Promise<ReviewCheck> {
  const fail = (message: string, status = 400): ReviewCheck => ({ ok: false, status, message });
  const { data: prData } = await octokit.pulls.get({ owner: REPO_OWNER, repo: REPO_NAME, pull_number: o.pullNumber });

  if (prData.state !== "open") return fail("This pull request is not open.");
  if (prData.base.ref !== MAIN_BRANCH) return fail(`Only PRs targeting '${MAIN_BRANCH}' can be reviewed here.`);
  if (prData.head.repo?.full_name !== `${REPO_OWNER}/${REPO_NAME}`) return fail("PRs from forks can't be reviewed in the Studio.");
  if (!REVIEWABLE_BRANCH_RE.test(prData.head.ref)) return fail("Only CMS draft branches can be reviewed in the Studio.");
  if (!o.expectedHeadSha || prData.head.sha !== o.expectedHeadSha) {
    return fail("This article changed since you opened it. Reopen the preview to review the latest version.", 409);
  }

  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: o.pullNumber,
    per_page: 100,
  });
  const fileCheck = validateArticlePRFiles(files);
  if (!fileCheck.ok) return fail(fileCheck.error);
  if (fileCheck.vertical !== o.targetVertical) {
    return fail(`Article location '${fileCheck.vertical}' does not match the reviewed vertical '${o.targetVertical}'.`);
  }

  const prAuthor = (prData.user?.login || "").toLowerCase();
  const commits = await octokit.paginate(octokit.pulls.listCommits, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: o.pullNumber,
    per_page: 100,
  });
  const contributors = new Set<string>(prAuthor ? [prAuthor] : []);
  for (const c of commits) {
    const login = c.author?.login?.toLowerCase();
    if (login) contributors.add(login);
  }
  for (const c of commits) {
    const committer = c.committer?.login?.toLowerCase();
    if (committer && committer !== "web-flow") contributors.add(committer);
  }
  const listingError = assertCompletePRListing(prData, files.length, commits.length);
  if (listingError) return fail(listingError);
  if (o.articleAuthorUsername) contributors.add(o.articleAuthorUsername.toLowerCase());
  if (contributors.has(o.reviewerUsername.toLowerCase())) {
    return fail("Self-review is forbidden. You authored or edited this article, so you cannot review it.", 403);
  }

  if (fileCheck.kind === "unpublish" && o.authorRole !== "vertical_head" && o.authorRole !== "superadmin") {
    return fail("Unpublish requests can only come from the Vertical Head or a Superadmin.", 403);
  }

  // Editing an article that is already published must be approved as if its ORIGINAL author's work
  // were being changed: a Member can't rewrite a Head's article under Member-level quorum.
  let effectiveAuthorRole = o.authorRole as EditorialRole;
  if (fileCheck.kind === "publish" && fileCheck.articleStatus === "modified") {
    if (!o.roleOf) return fail("Edits to published articles can't be verified right now.", 503);
    try {
      const { data: baseFile } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: fileCheck.articlePath,
        ref: prData.base.sha,
      });
      const raw = !Array.isArray(baseFile) && "content" in baseFile && typeof baseFile.content === "string"
        ? Buffer.from(baseFile.content, "base64").toString("utf-8")
        : "";
      const baseAuthor = String(matter(raw).data.authorUsername || "").toLowerCase();
      const baseRole = baseAuthor ? o.roleOf(baseAuthor) : "superadmin";
      if (editorialRank(baseRole) > editorialRank(effectiveAuthorRole)) effectiveAuthorRole = baseRole;
    } catch {
      return fail("Couldn't read the published version of this article to check who may approve the edit.");
    }
  }

  const decision = evaluateReviewerAuthority(o.reviewerRole as EditorialRole, effectiveAuthorRole);
  if (decision !== "merge" && decision !== "count-deputies") return fail(decision, 403);

  return {
    ok: true,
    headSha: prData.head.sha,
    headBranch: prData.head.ref,
    prAuthor,
    contributors,
    decision,
    kind: fileCheck.kind,
    articlePath: fileCheck.articlePath,
  };
}

/** Squash subject built server-side (the PR title is editable on GitHub and must not reach main's log). */
export function buildMergeSubject(kind: "publish" | "unpublish", vertical: string, title: string, slug: string, pullNumber: number) {
  const clean = (t: string) => t.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const words = clean(kind === "unpublish" ? `unpublish ${slug}` : title || slug).split(" ").slice(0, 20).join(" ");
  return `${kind === "unpublish" ? "chore" : "feat"}(${vertical}): ${words} (#${pullNumber})`;
}

export async function rejectPR(
  options: ReviewOptions & { reason: string }
): Promise<{ success: boolean; status?: number; message: string }> {
  const octokit = getOctokit(options.token);
  try {
    const check = await checkReviewPreconditions(octokit, options);
    if (!check.ok) return { success: false, status: check.status, message: check.message };

    await octokit.pulls.createReview({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: options.pullNumber,
      commit_id: check.headSha,
      event: "REQUEST_CHANGES",
      body: `❌ **Editorial Feedback & Revision Requested by @${options.reviewerUsername}:**\n\n${options.reason}`,
    });

    await octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: options.pullNumber,
      body: `### 📝 Editorial Feedback & Rejection\n**Reviewer:** @${options.reviewerUsername}\n\n${options.reason}`,
    });

    return {
      success: true,
      message: `Changes requested on PR #${options.pullNumber}. Author will see your feedback comment.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to request changes on PR";
    return { success: false, message: errorMsg };
  }
}

export async function approveAndMergePR(
  options: ReviewOptions
): Promise<{ success: boolean; merged: boolean; status?: number; message: string }> {
  const { token, pullNumber, reviewerUsername, reviewerRole, deputyUsernames = [] } = options;
  const octokit = getOctokit(token);

  try {
    const check = await checkReviewPreconditions(octokit, options);
    if (!check.ok) return { success: false, merged: false, status: check.status, message: check.message };
    const { headSha, headBranch, prAuthor, contributors, decision } = check;
    const cleanReviewer = reviewerUsername.toLowerCase();

    if (check.kind === "publish") {
      const problem = await placementProblemAtMerge(octokit, check.articlePath, headSha);
      if (problem) return { success: false, merged: false, status: 409, message: problem };
    }

    // Record the approval pinned to the reviewed commit
    try {
      await octokit.pulls.createReview({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullNumber,
        commit_id: headSha,
        event: "APPROVE",
        body: `Approved by @${reviewerUsername} (${reviewerRole}) via SSN Coding Club CMS Studio`,
      });
    } catch {
      // Quorum below uses our own count of reviews on this exact commit
    }

    if (decision === "count-deputies") {
      const reviews = await octokit.paginate(octokit.pulls.listReviews, {
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullNumber,
        per_page: 100,
      });
      const withCurrent = [...reviews, { user: { login: cleanReviewer }, state: "APPROVED", commit_id: headSha }];
      const deputyApproverCount = countDeputyApprovals(withCurrent, headSha, deputyUsernames, [...contributors]);
      if (deputyApproverCount < 2) {
        return {
          success: true,
          merged: false,
          message: `Deputy approval recorded! (${deputyApproverCount}/2 Deputy Approvals on the latest revision). Awaiting second Deputy or Vertical Head approval.`,
        };
      }
    }

    const slug = check.articlePath.replace(/^.*\/([a-z0-9-]+)\.md$/, "$1");
    const { data: mergeResult } = await octokit.pulls.merge({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
      sha: headSha,
      merge_method: "squash",
      commit_title: buildMergeSubject(check.kind, options.targetVertical, options.articleTitle || "", slug, pullNumber),
      commit_message: `Authored-by: @${prAuthor} <${prAuthor}@users.noreply.github.com>\nApproved-by: @${reviewerUsername} <${reviewerUsername}@users.noreply.github.com> (${reviewerRole})`,
    });

    if (mergeResult.merged && headBranch && REVIEWABLE_BRANCH_RE.test(headBranch)) {
      try {
        await octokit.git.deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${headBranch}` });
      } catch (deleteErr) {
        console.warn(`Could not delete branch ${headBranch}:`, deleteErr);
      }
    }

    return {
      success: mergeResult.merged,
      merged: Boolean(mergeResult.merged),
      message: mergeResult.merged
        ? `Successfully approved & merged PR #${pullNumber} into main! Branch ${headBranch} deleted.`
        : `GitHub did not merge PR #${pullNumber}: ${mergeResult.message}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Merge failed";
    return { success: false, merged: false, message: errorMsg };
  }
}

/**
 * Unpublishing never touches main directly (CLAUDE.md: no direct pushes to main). It opens an
 * "unpublish" pull request that removes the article on an isolated draft branch; the request then goes
 * through the normal review queue and quorum (a Head's request needs a Superadmin, a Superadmin's needs
 * another Superadmin), and is only merged by approveAndMergePR.
 */
export async function deletePublishedPost(
  token: string,
  vertical: string,
  slug: string,
  removerUsername: string
): Promise<{ success: boolean; message: string; pullNumber?: number; prUrl?: string }> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { success: false, message: "Security error: Invalid article slug format. Traversal characters are strictly forbidden." };
  }
  if (!ALLOWED_VERTICALS.includes(vertical)) {
    return { success: false, message: `Invalid vertical '${vertical}'.` };
  }

  const octokit = getOctokit(token);
  const filePath = vertical === "club" ? `content/club/posts/${slug}.md` : `content/verticals/${vertical}/posts/${slug}.md`;
  let branchName = "";
  let createdBranch = false;

  try {
    const { data: refData } = await octokit.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${MAIN_BRANCH}` });
    const { data: existing } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      ref: refData.object.sha,
    });
    if (Array.isArray(existing) || !("sha" in existing) || !existing.sha) {
      return { success: false, message: "Article file not found." };
    }

    branchName = `draft/${vertical}/unpublish-${slug}-${Date.now().toString().slice(-5)}`;
    await octokit.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branchName}`, sha: refData.object.sha });
    createdBranch = true;

    await octokit.repos.deleteFile({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message: `chore(${vertical}): unpublish ${slug} [skip vercel]`,
      sha: existing.sha,
      branch: branchName,
    });

    const { data: pr } = await octokit.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `chore(${vertical}): unpublish ${slug}`,
      head: branchName,
      base: MAIN_BRANCH,
      body: `## Unpublish request\n\n@${removerUsername} asked to remove \`${filePath}\` from the website.\n\nThe article stays live until this request is approved and merged through CMS Studio review.`,
    });

    return {
      success: true,
      pullNumber: pr.number,
      prUrl: pr.html_url,
      message: `Unpublish request opened as PR #${pr.number}. The article stays live until it is approved.`,
    };
  } catch (err: unknown) {
    if (createdBranch) {
      try {
        await octokit.git.deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${branchName}` });
      } catch {
        // best effort
      }
    }
    const errorMsg = err instanceof Error ? err.message : "Failed to open the unpublish request";
    return { success: false, message: errorMsg };
  }
}



export interface PublishedPostMetadata {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  coverImage?: string;
  tags?: string[];
  filePath: string;
}

export async function listAllPublishedPostsFromGitHub(
  token: string
): Promise<PublishedPostMetadata[]> {
  const octokit = getOctokit(token);

  try {
    const { data: treeData } = await octokit.git.getTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree_sha: MAIN_BRANCH,
      recursive: "true",
    });

    const postItems = treeData.tree.filter(
      (item) =>
        item.type === "blob" &&
        item.path &&
        (
          (item.path.startsWith("content/verticals/") && item.path.includes("/posts/") && item.path.endsWith(".md")) ||
          (item.path.startsWith("content/club/posts/") && item.path.endsWith(".md"))
        )
    );

    const posts: PublishedPostMetadata[] = await Promise.all(
      postItems.map(async (item) => {
        const filePath = item.path!;
        let vertical = "club";
        if (filePath.startsWith("content/verticals/")) {
          const parts = filePath.split("/");
          vertical = parts[2];
        }

        const fileName = filePath.split("/").pop() || "";
        const slug = fileName.replace(/\.md$/, "");

        try {
          const { data: blob } = await octokit.git.getBlob({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            file_sha: item.sha!,
          });

          const rawContent = Buffer.from(blob.content, "base64").toString("utf-8");
          const { data } = matter(rawContent);

          return {
            slug,
            vertical,
            title: data.title || slug,
            date: normalizeContentDate(data.date),
            author: data.author || "SSN Coding Club Member",
            summary: data.summary || "",
            coverImage: data.coverImage || "",
            tags: Array.isArray(data.tags) ? data.tags : [],
            filePath,
          };
        } catch {
          return {
            slug,
            vertical,
            title: slug,
            date: "",
            author: "SSN Coding Club Member",
            summary: "",
            filePath,
          };
        }
      })
    );

    posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return posts;
  } catch (err) {
    // Surface the failure: returning [] made callers think the repo had no articles.
    console.error("Error fetching published posts tree from GitHub:", err);
    throw err;
  }
}

// -------------------------------------------------------------
// Cross-Device Personal Draft Branch Functions (Zero-DB Cloud Persistence)
// -------------------------------------------------------------

export interface PersonalDraftParams {
  token: string;
  authorUsername: string;
  authorDisplayName: string;
  vertical: string;
  slug: string;
  title: string;
  summary: string;
  coverImage?: string;
  targetPortals?: string[];
  tags: string[];
  markdownBody: string;
  pendingImages?: PendingImage[];
}

export interface PersonalDraftInfo {
  branch: string;
  slug: string;
  vertical: string;
  title: string;
  updatedAt: string;
}

/**
 * Pushes WIP draft directly to a personal Git draft branch without opening a PR.
 * Branch name format: drafts/{authorUsername}/{slug}
 */
export async function savePersonalDraftBranch(params: PersonalDraftParams): Promise<{ branch: string; commitSha: string }> {
  const octokit = getOctokit(params.token);
  const {
    authorUsername,
    authorDisplayName,
    vertical,
    slug,
    title,
    summary,
    targetPortals,
    tags,
    markdownBody,
    pendingImages,
  } = params;

  if (!ALLOWED_VERTICALS.includes(vertical)) {
    throw new Error(`Invalid technical vertical: '${vertical}'. Must be one of: ${ALLOWED_VERTICALS.join(", ")}`);
  }

  const unresolvedImages = findUnresolvedLocalImageUrls(markdownBody, params.coverImage, pendingImages);
  if (unresolvedImages.length > 0) {
    throw new Error(
      `Some images were never uploaded (${unresolvedImages.length}); they only exist in your browser. ` +
        "Re-add the cover image and any broken inline images, then sync again."
    );
  }

  const cleanSlug = (slug || title || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);

  const branchName = `drafts/${authorUsername.toLowerCase()}/${cleanSlug}`;

  // 1. Check if branch already exists, or branch off main
  let branchSha: string;
  try {
    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${branchName}`,
    });
    branchSha = refData.object.sha;
  } catch {
    // Branch doesn't exist, branch off main
    const { data: mainRef } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${MAIN_BRANCH}`,
    });
    branchSha = mainRef.object.sha;
    await octokit.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: branchSha,
    });
  }

  // 2. Process and upload pending images on this draft branch
  let processedBody = markdownBody;
  let processedCoverImage = params.coverImage || "";

  if (pendingImages && pendingImages.length > 0) {
    for (const img of pendingImages) {
      if (!isSafePendingImage(img.filename, img.base64)) {
        continue;
      }
      const ext = img.filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "png";
      const base = img.filename.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      const cleanImgName = `${Date.now()}-${base}.${ext}`;
      const imgPath = `apps/main-portal/public/uploads/${cleanImgName}`;
      const permanentUrl = `/uploads/${cleanImgName}`;

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: imgPath,
        message: `chore(media): save ${cleanImgName} to draft branch`,
        content: img.base64,
        branch: branchName,
      });

      if (img.placeholderUrl) {
        processedBody = processedBody.replaceAll(img.placeholderUrl, permanentUrl);
        if (processedCoverImage === img.placeholderUrl) {
          processedCoverImage = permanentUrl;
        }
      }
    }
  }

  // 3. Prepare markdown frontmatter
  const today = new Date().toISOString().split("T")[0];
  const fileData = {
    title: title || "Untitled Draft",
    date: today,
    author: authorDisplayName || authorUsername,
    authorUsername,
    authorAvatar: `https://github.com/${authorUsername}.png`,
    summary: summary || "",
    targetPortals: resolveTargetPortals(vertical, targetPortals),
    vertical: vertical || "club",
    ...(processedCoverImage ? { coverImage: processedCoverImage } : {}),
    tags: tags && tags.length > 0 ? tags : [vertical],
    isWipDraft: true,
  };

  const fileContent = matter.stringify(processedBody, fileData);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  const filePath =
    vertical === "club"
      ? `content/club/posts/${cleanSlug}.md`
      : `content/verticals/${vertical}/posts/${cleanSlug}.md`;

  // 4. Get file SHA if it already exists on this draft branch to update it cleanly
  let existingSha: string | undefined;
  try {
    const { data: fileRes } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      ref: branchName,
    });
    if ("sha" in fileRes) {
      existingSha = fileRes.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  const { data: commitRes } = await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: filePath,
    message: `draft(${vertical}): update wip draft ${cleanSlug} [skip vercel]`,
    content: contentBase64,
    branch: branchName,
    sha: existingSha,
    author: {
      name: authorDisplayName || authorUsername,
      email: `${authorUsername}@users.noreply.github.com`,
    },
    committer: {
      name: "SSN Coding Club Studio",
      email: "bot@ssncodingclub.org",
    },
  });

  return {
    branch: branchName,
    commitSha: commitRes.commit.sha || "",
  };
}

/**
 * Lists all personal WIP draft branches for a user (drafts/{authorUsername}/*)
 */
export async function listPersonalDraftBranches(token: string, authorUsername: string): Promise<PersonalDraftInfo[]> {
  const octokit = getOctokit(token);
  try {
    const prefix = `drafts/${authorUsername.toLowerCase()}/`;
    // Only this user's refs, with no 100-branch cut-off.
    const refs = await octokit.paginate(octokit.git.listMatchingRefs, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${prefix}`,
      per_page: 100,
    });
    const userDraftBranches = refs.map((r) => ({
      name: r.ref.replace(/^refs\/heads\//, ""),
      commit: { sha: r.object.sha },
    }));
    const results: PersonalDraftInfo[] = [];

    for (const b of userDraftBranches) {
      try {
        const { data: commitData } = await octokit.repos.getCommit({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          ref: b.commit.sha,
        });

        const slug = b.name.replace(prefix, "");
        results.push({
          branch: b.name,
          slug,
          vertical: "unknown",
          title: slug.replace(/-/g, " "),
          updatedAt: commitData.commit.committer?.date || new Date().toISOString(),
        });
      } catch {
        // continue
      }
    }

    return results;
  } catch (err) {
    console.error("Error listing personal draft branches:", err);
    return [];
  }
}

/**
 * Retrieves draft content from a personal draft branch
 */
export async function getPersonalDraftBranch(token: string, branchName: string) {
  const octokit = getOctokit(token);
  try {
    const { data: commit } = await octokit.repos.getCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: branchName,
    });

    // The branch is cut from main, so its tree contains every published post. Only the article
    // this branch actually changed is the draft.
    const { data: comparison } = await octokit.repos.compareCommits({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      base: MAIN_BRANCH,
      head: commit.sha,
    });
    const changed = (comparison.files || []).filter(
      (f) => f.status !== "removed" && /^content\/.+\/posts\/[a-z0-9-]+\.md$/.test(f.filename)
    );
    const postFile = changed.length > 0 ? { path: changed[changed.length - 1].filename, sha: changed[changed.length - 1].sha } : null;

    if (!postFile || !postFile.sha) {
      throw new Error("No article file found in draft branch");
    }

    const { data: blob } = await octokit.git.getBlob({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      file_sha: postFile.sha,
    });

    const rawContent = Buffer.from(blob.content, "base64").toString("utf-8");
    const { data: frontmatter, content: markdownBody } = matter(rawContent);

    return {
      title: frontmatter.title || "",
      vertical: frontmatter.vertical || "club",
      summary: frontmatter.summary || "",
      coverImage: frontmatter.coverImage || "",
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      targetPortals: Array.isArray(frontmatter.targetPortals) ? frontmatter.targetPortals : ["main-portal"],
      markdownBody,
    };
  } catch (err) {
    console.error(`Error loading personal draft branch ${branchName}:`, err);
    throw err;
  }
}



/**
 * A blog being merged may say where it sits in a learning track (frontmatter `placement`). Re-check it
 * against the track on CURRENT main (not the PR's recorded base), so a topic removed after the PR was
 * opened can't leave a dangling placement. Returns a reason to refuse, or null.
 */
export async function placementProblemAtMerge(octokit: Octokit, articlePath: string, headSha: string): Promise<string | null> {
  const { data: file } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: articlePath, ref: headSha });
  if (Array.isArray(file) || !("content" in file) || typeof file.content !== "string") return null;
  const raw = matter(Buffer.from(file.content, "base64").toString("utf-8")).data.placement;
  if (raw === undefined) return null;
  const vertical = articlePath.match(/^content\/verticals\/([^/]+)\/posts\//)?.[1];
  if (!vertical) return "Only vertical blogs can be placed in a learning track. Remove the placement.";
  const placement = parsePlacement(raw);
  if (!placement) return "This blog's placement is malformed. Edit the blog and pick its place again (or none).";
  let track: unknown = null;
  try {
    const { data: tf } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `content/verticals/${vertical}/tracks/${placement.track}.json`,
      ref: MAIN_BRANCH,
    });
    if (!Array.isArray(tf) && "content" in tf && typeof tf.content === "string") {
      const parsed = validateTrack(JSON.parse(Buffer.from(tf.content, "base64").toString("utf-8")), { vertical });
      track = parsed.track;
    }
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404 && !(err instanceof SyntaxError)) throw err;
  }
  const problems = placementErrors(placement, { vertical, tracks: track ? { [placement.track]: track as Track } : {} });
  if (problems.length === 0) return null;
  const where = [placement.track, placement.topic, placement.subtopic].filter(Boolean).join(" › ");
  return `This blog is placed under "${where}", which doesn't exist on main any more. Edit the blog and pick another place (or none).`;
}
