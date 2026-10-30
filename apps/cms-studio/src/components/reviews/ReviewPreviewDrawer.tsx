"use client";

import { useMemo } from "react";
import Link from "next/link";
import { marked } from "marked";
import { ExternalLink, GitPullRequestArrow, ShieldCheck } from "lucide-react";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import type { ReviewPr } from "@/lib/hooks/useReviewQueue";
import { Button, Drawer, buttonClasses } from "@/components/ui";
import ArticlePreview from "@/components/editor/ArticlePreview";

export interface PreviewArticle {
  title: string;
  markdownBody: string;
  coverImage?: string;
  author: string;
  vertical: string;
  summary?: string;
  tags?: string[];
  pullNumber: number;
}

export default function ReviewPreviewDrawer({
  article,
  pr,
  canReview,
  isMine,
  hasApproved,
  approving,
  onClose,
  onApprove,
  onRequestChanges,
}: {
  article: PreviewArticle | null;
  pr: ReviewPr | undefined;
  canReview: boolean;
  isMine: boolean;
  hasApproved: boolean;
  approving: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  const html = useMemo(
    () => (article ? sanitizeArticleHtml(marked.parse(article.markdownBody || "", { gfm: true, breaks: true }) as string) : ""),
    [article]
  );

  const actions = (
    <>
      {pr ? (
        <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm", variant: "ghost" })}>
          GitHub
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
      {isMine && pr?.changesRequested ? (
        <Link href={`/admin?revise=${pr.number}`} className={buttonClasses({ size: "sm", variant: "primary" })}>
          <GitPullRequestArrow className="h-4 w-4" aria-hidden />
          Load &amp; revise
        </Link>
      ) : null}
      {canReview && pr ? (
        <>
          <Button size="sm" onClick={onRequestChanges}>
            Request changes
          </Button>
          <Button size="sm" variant="primary" icon={ShieldCheck} loading={approving} disabled={hasApproved} onClick={onApprove}>
            {hasApproved ? "Approved by you" : "Approve"}
          </Button>
        </>
      ) : null}
    </>
  );

  return (
    <Drawer
      open={Boolean(article)}
      onClose={onClose}
      width="xl"
      title={article ? `PR #${article.pullNumber} · ${article.title}` : ""}
      headerActions={actions}
    >
      {article ? (
        <div className="bg-surface p-4 sm:p-6">
          <ArticlePreview
            authorName={article.author}
            authorLogin={pr?.author || article.author}
            authorAvatar={pr?.authorAvatar}
            selectedVertical={article.vertical}
            title={article.title}
            coverImage={article.coverImage || ""}
            html={html}
            summary={article.summary}
            tags={article.tags}
          />
        </div>
      ) : null}
    </Drawer>
  );
}
