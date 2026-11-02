import { Octokit } from "@octokit/rest";
import matter from "gray-matter";

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

function isSafePendingImage(filename: string, base64: string): boolean {
  const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "";
  const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
  if (!allowed.includes(ext)) return false;

  const buf = Buffer.from(base64, "base64");
  if (buf.length > 5 * 1024 * 1024) return false;

  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isGif = buf.length > 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  const isWebp = buf.length > 12 && buf.toString("utf8", 0, 4) === "RIFF" && buf.toString("utf8", 8, 12) === "WEBP";

  return isJpeg || isPng || isGif || isWebp;
}

export async function createDraftAndPullRequest(params: CreateDraftParams): Promise<DraftResult> {
  const fallbackToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
  let octokit = getOctokit(params.token);
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

  let branchName = existingBranch;

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
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    branchName = `draft/${vertical}/${cleanSlug}-${timestamp}`;

    try {
      await octokit.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: `refs/heads/${branchName}`,
        sha: mainSha,
      });
    } catch (refErr: unknown) {
      const err = refErr as { status?: number; message?: string };
      if ((err.status === 404 || err.status === 403) && fallbackToken) {
        octokit = getOctokit(fallbackToken);
        await octokit.git.createRef({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          ref: `refs/heads/${branchName}`,
          sha: mainSha,
        });
      } else {
        throw new Error(
          err.status === 404 || err.status === 403
            ? `Repository write permission required on ${REPO_OWNER}/${REPO_NAME}. Please accept the GitHub collaborator invitation sent to @${authorUsername} or ask an admin to assign you.`
            : (err.message || "Failed to create draft branch on GitHub.")
        );
      }
    }
  }

  // 3. Process and upload pending images ON THE DRAFT BRANCH
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

  // 4. Prepare markdown frontmatter
  const today = new Date().toISOString().split("T")[0];
  const fileData = {
    title,
    date: today,
    author: authorDisplayName || authorUsername,
    authorUsername,
    authorAvatar: `https://github.com/${authorUsername}.png`,
    summary,
    targetPortals: targetPortals && targetPortals.length > 0 ? targetPortals : ["main-portal"],
    vertical,
    ...(processedCoverImage ? { coverImage: processedCoverImage } : {}),
    tags: tags && tags.length > 0 ? tags : [vertical],
  };

  const fileContent = matter.stringify(processedBody, fileData);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filePath =
    vertical === "club"
      ? `content/club/posts/${cleanSlug}.md`
      : `content/verticals/${vertical}/posts/${cleanSlug}.md`;

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
}

export async function listPendingReviewPRs(token: string): Promise<PendingPR[]> {
  const octokit = getOctokit(token);
  const { data: pulls } = await octokit.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: "open",
    base: MAIN_BRANCH,
    sort: "created",
    direction: "desc",
  });

  // Fetch reviews for each PR to check approval quorum and feedback
  const prsWithReviews = await Promise.all(
    pulls.map(async (pr) => {
      let vertical = "general";
      const match =
        pr.title.match(/\[(?:Draft:\s*)?([a-zA-Z0-9_-]+)\]/i) ||
        pr.title.match(/feat\(([a-zA-Z0-9_-]+)\)/i);
      if (match && match[1]) {
        vertical = match[1].toLowerCase();
      }

      let reviewsList: { user: string; state: string; body: string; date: string }[] = [];
      let approvers: string[] = [];
      let changesRequested = false;
      let latestFeedback = "";

      try {
        const { data: reviews } = await octokit.pulls.listReviews({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pr.number,
        });

        reviewsList = reviews.map((r) => ({
          user: r.user?.login || "unknown",
          state: r.state,
          body: r.body || "",
          date: r.submitted_at || "",
        }));

        approvers = Array.from(
          new Set(
            reviews
              .filter((r) => r.state === "APPROVED")
              .map((r) => r.user?.login?.toLowerCase())
              .filter(Boolean) as string[]
          )
        );

        const changeReqs = reviews.filter((r) => r.state === "CHANGES_REQUESTED");
        if (changeReqs.length > 0) {
          changesRequested = true;
          latestFeedback = changeReqs[changeReqs.length - 1].body || "";
        }

        // Also check PR comments for editorial feedback comments (e.g. self-rejection or comment fallback)
        try {
          const { data: comments } = await octokit.issues.listComments({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            issue_number: pr.number,
            per_page: 50,
          });

          const feedbackComments = comments.filter((c) =>
            c.body && c.body.includes("Editorial Feedback & Rejection")
          );

          if (feedbackComments.length > 0) {
            changesRequested = true;
            const lastComment = feedbackComments[feedbackComments.length - 1];
            // Extract the actual feedback text from markdown body
            const cleaned = (lastComment.body || "")
              .replace(/###\s*📝\s*Editorial Feedback & Rejection/i, "")
              .replace(/\*\*Reviewer:\*\*\s*@\w+/i, "")
              .trim();
            latestFeedback = cleaned || latestFeedback || "Revisions requested by editorial reviewer.";
          }
        } catch (commentErr) {
          console.warn(`Could not fetch comments for PR #${pr.number}:`, commentErr);
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
        approvers,
        changesRequested,
        latestFeedback,
        reviews: reviewsList,
      };
    })
  );

  return prsWithReviews;
}

// ---------------------------------------------------------------------------
// Editorial governance helpers (pure, unit-tested)
// ---------------------------------------------------------------------------

const ARTICLE_PATH_RE = /^content\/(?:verticals\/([a-z0-9-]+)|(club))\/posts\/([a-z0-9-]+)\.md$/;
const UPLOAD_PATH_RE = /^apps\/main-portal\/public\/uploads\/[A-Za-z0-9._-]+$/;

export type PRFileCheck =
  | { ok: true; articlePath: string; vertical: string }
  | { ok: false; error: string };

/** A CMS article PR may contain exactly one article file plus uploaded images, nothing else. */
export function validateArticlePRFiles(filenames: string[]): PRFileCheck {
  const articles = filenames.filter((f) => ARTICLE_PATH_RE.test(f));
  const others = filenames.filter((f) => !ARTICLE_PATH_RE.test(f) && !UPLOAD_PATH_RE.test(f));
  if (others.length > 0) {
    return { ok: false, error: `PR modifies files outside article content and uploads: ${others.slice(0, 5).join(", ")}` };
  }
  if (articles.length !== 1) {
    return { ok: false, error: `PR must contain exactly one article file (found ${articles.length}).` };
  }
  const m = articles[0].match(ARTICLE_PATH_RE)!;
  return { ok: true, articlePath: articles[0], vertical: m[1] || m[2] };
}

export type EditorialRole = "superadmin" | "vertical_head" | "deputy" | "member" | "none";

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

  const check = validateArticlePRFiles(files.map((f) => f.filename));
  if (!check.ok) {
    throw new Error(check.error);
  }
  const mdFile = { filename: check.articlePath };

  const { data: prData } = await octokit.pulls.get({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: pullNumber,
  });

  const { data: fileRes } = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: mdFile.filename,
    ref: prData.head.sha,
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

export async function rejectPR(
  token: string,
  pullNumber: number,
  reviewerUsername: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const octokit = getOctokit(token);
  try {
    // 1. Submit formal review requesting changes
    try {
      await octokit.pulls.createReview({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullNumber,
        event: "REQUEST_CHANGES",
        body: `❌ **Editorial Feedback & Revision Requested by @${reviewerUsername}:**\n\n${reason}`,
      });
    } catch {
      // In case self-review or permissions restrict event
    }

    // 2. Post comment to the PR discussion
    await octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: pullNumber,
      body: `### 📝 Editorial Feedback & Rejection\n**Reviewer:** @${reviewerUsername}\n\n${reason}`,
    });

    return {
      success: true,
      message: `Changes requested on PR #${pullNumber}. Author will see your feedback comment.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to request changes on PR";
    return { success: false, message: errorMsg };
  }
}

export interface ApproveAndMergeOptions {
  token: string;
  pullNumber: number;
  reviewerUsername: string;
  reviewerRole: string;
  targetVertical: string;
  authorRole: string;
  deputyUsernames?: string[];
  /** authorUsername from the article frontmatter (excluded from approving). */
  articleAuthorUsername?: string;
}

export async function approveAndMergePR(
  options: ApproveAndMergeOptions
): Promise<{ success: boolean; merged: boolean; message: string }> {
  const {
    token,
    pullNumber,
    reviewerUsername,
    reviewerRole,
    authorRole,
    deputyUsernames = [],
  } = options;
  const octokit = getOctokit(token);

  try {
    // 1. Fetch PR details
    const { data: prData } = await octokit.pulls.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
    });
    const headBranch = prData.head.ref;
    const headSha = prData.head.sha;
    const prAuthor = (prData.user?.login || "author").toLowerCase();
    const cleanReviewer = reviewerUsername.toLowerCase();
    const fail = (message: string) => ({ success: false, merged: false, message });

    if (prData.state !== "open") return fail("This pull request is not open.");
    if (prData.base.ref !== MAIN_BRANCH) return fail(`Only PRs targeting '${MAIN_BRANCH}' can be merged here.`);

    // 2. The PR may only contain one article (in the vertical being reviewed) plus uploads
    const files = await octokit.paginate(octokit.pulls.listFiles, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
      per_page: 100,
    });
    const fileCheck = validateArticlePRFiles(files.map((f) => f.filename));
    if (!fileCheck.ok) return fail(fileCheck.error);
    if (fileCheck.vertical !== options.targetVertical) {
      return fail(
        `Article location '${fileCheck.vertical}' does not match the reviewed vertical '${options.targetVertical}'.`
      );
    }

    // 3. STRICT anti-self-review: PR opener, frontmatter author and every commit author are excluded
    const commits = await octokit.paginate(octokit.pulls.listCommits, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
      per_page: 100,
    });
    const contributors = new Set<string>([prAuthor]);
    for (const c of commits) {
      const login = c.author?.login?.toLowerCase();
      if (login) contributors.add(login);
    }
    if (options.articleAuthorUsername) contributors.add(options.articleAuthorUsername.toLowerCase());
    if (contributors.has(cleanReviewer)) {
      return fail("Self-approval is forbidden. You authored or edited this article, so you cannot approve it.");
    }

    // 4. Authority check BEFORE recording any GitHub review
    const decision = evaluateReviewerAuthority(reviewerRole as EditorialRole, authorRole as EditorialRole);
    if (decision !== "merge" && decision !== "count-deputies") return fail(decision);

    // 5. Record the approval pinned to the reviewed commit
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

    // 6. Merge exactly the reviewed commit (GitHub rejects if the author pushed after review)
    const { data: mergeResult } = await octokit.pulls.merge({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
      sha: headSha,
      merge_method: "squash",
      commit_title: `${prData.title} (#${pullNumber})`,
      commit_message: `Authored-by: @${prAuthor} <${prAuthor}@users.noreply.github.com>\nApproved-by: @${reviewerUsername} <${reviewerUsername}@users.noreply.github.com> (${reviewerRole})`,
    });

    // 5. Delete head branch to prevent branch clutter
    if (mergeResult.merged && headBranch && (headBranch.startsWith("draft/") || headBranch.startsWith("cms/"))) {
      try {
        await octokit.git.deleteRef({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          ref: `heads/${headBranch}`,
        });
      } catch (deleteErr) {
        console.warn(`Could not delete branch ${headBranch}:`, deleteErr);
      }
    }

    return {
      success: mergeResult.merged,
      merged: true,
      message: `Successfully approved & merged PR #${pullNumber} into main! Branch ${headBranch} deleted.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Merge failed";
    return { success: false, merged: false, message: errorMsg };
  }
}

export async function deletePublishedPost(
  token: string,
  vertical: string,
  slug: string,
  removerUsername: string
): Promise<{ success: boolean; message: string }> {
  // Security validation: strictly alphanumeric lowercase slugs with hyphens only
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/(^-|-$)/g, "");
  if (!cleanSlug || cleanSlug !== slug.toLowerCase()) {
    return { success: false, message: "Security error: Invalid article slug format. Traversal characters are strictly forbidden." };
  }

  const cleanVertical = vertical.toLowerCase().replace(/[^a-z0-9-]/g, "");

  const octokit = getOctokit(token);
  const filePath =
    cleanVertical === "club"
      ? `content/club/posts/${cleanSlug}.md`
      : `content/verticals/${cleanVertical}/posts/${cleanSlug}.md`;

  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      ref: MAIN_BRANCH,
    });

    if (Array.isArray(data) || !data.sha) {
      return { success: false, message: "Article file not found or is a directory." };
    }

    await octokit.repos.deleteFile({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message: `chore(unpublish): remove ${slug} in ${vertical} by @${removerUsername}`,
      sha: data.sha,
      branch: MAIN_BRANCH,
      committer: {
        name: removerUsername,
        email: `${removerUsername}@users.noreply.github.com`,
      },
    });

    return {
      success: true,
      message: `Article '${slug}' in ${vertical} has been successfully unpublished from main.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to unpublish article";
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
            date: data.date ? String(data.date).split("T")[0] : "",
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
    console.error("Error fetching published posts tree from GitHub:", err);
    return [];
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
    targetPortals: targetPortals && targetPortals.length > 0 ? targetPortals : ["main-portal"],
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
    const { data: branches } = await octokit.repos.listBranches({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      per_page: 100,
    });

    const userDraftBranches = branches.filter((b) => b.name.startsWith(prefix));
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

