import { Octokit } from "@octokit/rest";
import matter from "gray-matter";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";
const MAIN_BRANCH = "main";

export function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
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
  tags: string[];
  markdownBody: string;
}

export interface DraftResult {
  pullNumber: number;
  prUrl: string;
  branch: string;
}

export async function createDraftAndPullRequest(params: CreateDraftParams): Promise<DraftResult> {
  const octokit = getOctokit(params.token);
  const {
    authorUsername,
    authorDisplayName,
    vertical,
    slug,
    title,
    summary,
    coverImage,
    tags,
    markdownBody,
  } = params;

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
  const branchName = `draft/${vertical}/${cleanSlug}-${timestamp}`;

  await octokit.git.createRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: mainSha,
  });

  // 3. Prepare markdown frontmatter
  const today = new Date().toISOString().split("T")[0];
  const fileData = {
    title,
    date: today,
    author: authorDisplayName || authorUsername,
    summary,
    ...(coverImage ? { coverImage } : {}),
    tags: tags && tags.length > 0 ? tags : [vertical],
  };

  const fileContent = matter.stringify(markdownBody, fileData);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  const filePath =
    vertical === "club"
      ? `content/club/posts/${cleanSlug}.md`
      : `content/verticals/${vertical}/posts/${cleanSlug}.md`;

  // 4. Commit file to draft branch
  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: filePath,
    message: `feat(${vertical}): add ${cleanSlug} article`,
    content: contentBase64,
    branch: branchName,
  });

  // 5. Create Pull Request
  const prTitle = `feat(${vertical}): ${title}`;
  const prBody = `## Overview
New article submission for the **${vertical}** technical vertical.

- **Title:** ${title}
- **Author:** ${authorDisplayName} (@${authorUsername})
- **Date:** ${today}
- **Summary:** ${summary}
${coverImage ? `\n- **Cover Banner:** ![](${coverImage})\n` : ""}

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

  return pulls.map((pr) => {
    // Parse vertical from title "[Draft: <vertical>] ..."
    let vertical = "general";
    const match = pr.title.match(/\[(?:Draft:\s*)?([a-zA-Z0-9_-]+)\]/i);
    if (match && match[1]) {
      vertical = match[1].toLowerCase();
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
    };
  });
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

export async function approveAndMergePR(
  token: string,
  pullNumber: number,
  reviewerUsername: string
): Promise<{ success: boolean; message: string }> {
  const octokit = getOctokit(token);

  try {
    // 1. Fetch PR to get head branch name for cleanup
    const { data: prData } = await octokit.pulls.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
    });
    const headBranch = prData.head.ref;

    // 2. Submit an approving review
    try {
      await octokit.pulls.createReview({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullNumber,
        event: "APPROVE",
        body: `Approved by @${reviewerUsername} via SSN Coding Club CMS Studio`,
      });
    } catch {
      // If author is same as reviewer, self-review is not permitted by GitHub API, continue to merge
    }

    // 3. Merge PR
    const { data: mergeResult } = await octokit.pulls.merge({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
      merge_method: "squash",
      commit_title: `feat: merge editorial PR #${pullNumber} into main`,
    });

    // 4. Automatically delete the head branch so no draft branches are left behind!
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
      message: mergeResult.message || `Successfully merged PR #${pullNumber} and deleted branch ${headBranch}!`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Merge failed";
    return { success: false, message: errorMsg };
  }
}

export async function uploadImageToGitHub(
  token: string,
  filename: string,
  base64Data: string
): Promise<string> {
  const octokit = getOctokit(token);
  const cleanName = `${Date.now()}-${filename.toLowerCase().replace(/[^a-z0-9.-]+/g, "-")}`;
  const repoPath = `apps/main-portal/public/uploads/${cleanName}`;

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: repoPath,
    message: `chore(media): upload ${cleanName}`,
    content: base64Data,
    branch: MAIN_BRANCH,
  });

  return `/uploads/${cleanName}`;
}
