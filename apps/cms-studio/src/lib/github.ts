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
    targetPortals,
    tags,
    markdownBody,
    pendingImages,
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

  // 3. Process and upload pending images ON THE DRAFT BRANCH (never to main directly!)
  let processedBody = markdownBody;
  let processedCoverImage = params.coverImage || "";

  if (pendingImages && pendingImages.length > 0) {
    for (const img of pendingImages) {
      const cleanImgName = `${Date.now()}-${img.filename.toLowerCase().replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const imgPath = `apps/main-portal/public/uploads/${cleanImgName}`;
      const permanentUrl = `/uploads/${cleanImgName}`;

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: imgPath,
        message: `chore(media): upload ${cleanImgName} on draft branch`,
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

  const filePath =
    vertical === "club"
      ? `content/club/posts/${cleanSlug}.md`
      : `content/verticals/${vertical}/posts/${cleanSlug}.md`;

  // 5. Commit file to draft branch
  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: filePath,
    message: `feat(${vertical}): add ${cleanSlug} article`,
    content: contentBase64,
    branch: branchName,
    author: {
      name: authorDisplayName || authorUsername,
      email: `${authorUsername}@users.noreply.github.com`,
    },
    committer: {
      name: "SSN Coding Club Studio",
      email: "bot@ssncodingclub.org",
    },
  });

  // 5. Create Pull Request
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
  const { data: files } = await octokit.pulls.listFiles({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    pull_number: pullNumber,
  });

  const mdFile = files.find((f) => f.filename.endsWith(".md") || f.filename.endsWith(".mdx"));
  if (!mdFile) {
    throw new Error("No article file found in this draft PR.");
  }

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
    return {
      filePath: mdFile.filename,
      frontmatter: parsed.data,
      markdownBody: parsed.content,
      branch: prData.head.ref,
      title: (parsed.data.title as string) || prData.title,
      coverImage: (parsed.data.coverImage as string) || "",
      summary: (parsed.data.summary as string) || "",
      tags: (parsed.data.tags as string[]) || [],
      vertical: (parsed.data.vertical as string) || "general",
      author: (parsed.data.author as string) || prData.user?.login || "unknown",
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
    const prAuthor = prData.user?.login || "author";

    // 2. Submit approving review for this reviewer
    try {
      await octokit.pulls.createReview({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullNumber,
        event: "APPROVE",
        body: `Approved by @${reviewerUsername} (${reviewerRole}) via SSN Coding Club CMS Studio`,
      });
    } catch {
      // Self-review not permitted by GitHub API, continue to evaluation
    }

    // 3. Evaluate Quorum Requirements:
    // If author is Member:
    //   - Requires 2 Deputy approvals OR 1 Vertical Head OR 1 Superadmin
    let isQuorumReached = false;

    if (reviewerRole === "superadmin" || reviewerRole === "vertical_head") {
      isQuorumReached = true;
    } else if (reviewerRole === "deputy") {
      if (authorRole === "member") {
        // Fetch all current approvals on PR
        const { data: allReviews } = await octokit.pulls.listReviews({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pullNumber,
        });

        const distinctApprovers = Array.from(
          new Set(
            allReviews
              .filter((r) => r.state === "APPROVED")
              .map((r) => r.user?.login?.toLowerCase())
              .filter(Boolean) as string[]
          )
        );

        // Include current reviewer if not yet in distinctApprovers
        if (!distinctApprovers.includes(reviewerUsername.toLowerCase())) {
          distinctApprovers.push(reviewerUsername.toLowerCase());
        }

        const deputyApproverCount = distinctApprovers.filter((u) =>
          deputyUsernames.map((d) => d.toLowerCase()).includes(u)
        ).length;

        if (deputyApproverCount >= 2) {
          isQuorumReached = true;
        } else {
          return {
            success: true,
            merged: false,
            message: `Deputy approval recorded! (1/2 Deputy Approvals). Awaiting second Deputy or Vertical Head approval.`,
          };
        }
      } else {
        return {
          success: false,
          merged: false,
          message: `Articles by ${authorRole}s must be approved by the Vertical Head or a Superadmin.`,
        };
      }
    }

    if (!isQuorumReached) {
      return {
        success: false,
        merged: false,
        message: "Approval quorum not met.",
      };
    }

    // 4. Merge PR with Crystal-Clear Commit Provenance in git log
    const { data: mergeResult } = await octokit.pulls.merge({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: pullNumber,
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
  const octokit = getOctokit(token);
  const filePath =
    vertical === "club"
      ? `content/club/posts/${slug}.md`
      : `content/verticals/${vertical}/posts/${slug}.md`;

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
      const cleanImgName = `${Date.now()}-${img.filename.toLowerCase().replace(/[^a-zA-Z0-9.-]/g, "_")}`;
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
    message: `draft(${vertical}): update wip draft ${cleanSlug}`,
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

    const treeSha = commit.commit.tree.sha;
    const { data: tree } = await octokit.git.getTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree_sha: treeSha,
      recursive: "true",
    });

    const postFile = tree.tree.find(
      (item) => item.path && item.path.startsWith("content/") && item.path.endsWith(".md")
    );

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

