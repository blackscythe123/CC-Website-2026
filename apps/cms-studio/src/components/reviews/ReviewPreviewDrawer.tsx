"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, GitPullRequestArrow, ShieldCheck } from "lucide-react";
import { renderArticlePreview } from "@/lib/renderPreview";
import type { ReviewPr } from "@/lib/hooks/useReviewQueue";
import { Button, Drawer, buttonClasses } from "@/components/ui";
import ArticlePreview from "@/components/editor/ArticlePreview";
import TrackView from "@coding-club/content-render/track-view";
import type { Track } from "@coding-club/content-schema/tracks";

export interface PreviewArticle {
  title: string;
  markdownBody: string;
  coverImage?: string;
  author: string;
  vertical: string;
  summary?: string;
  tags?: string[];
  pullNumber: number;
  /** Head commit shown in this preview; sent back as expectedHeadSha when reviewing. */
  headSha?: string;
  /** "DSA Sheet › Arrays › Two pointers" when the blog is placed in a learning track. */
  placementLabel?: string | null;
  /** Present for learning-track proposals. */
  kind?: "publish" | "unpublish" | "track";
  track?: Track | null;
  trackErrors?: string[];
  slug?: string;
  /** A request to delete the whole track. */
  deleting?: boolean;
}

export default function ReviewPreviewDrawer({
  article,
  pr,
  canReview,
  isMine,
  hasApproved,
  stale = false,
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
  /** The PR got new commits after this preview was opened. */
  stale?: boolean;
  approving: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  const html = useMemo(
    () => (article && article.kind !== "track" ? renderArticlePreview(article.markdownBody || "") : ""),
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
        <Link href={article?.kind === "track" ? `/admin/tracks?revise=${pr.number}` : `/admin?revise=${pr.number}`} className={buttonClasses({ size: "sm", variant: "primary" })}>
          <GitPullRequestArrow className="h-4 w-4" aria-hidden />
          Load &amp; revise
        </Link>
      ) : null}
      {canReview && pr && isMine ? (
        <Button size="sm" variant="primary" icon={ShieldCheck} loading={approving} disabled={stale} onClick={onApprove}>
          Publish
        </Button>
      ) : canReview && pr ? (
        <>
          <Button size="sm" onClick={onRequestChanges} disabled={stale}>
            Request changes
          </Button>
          <Button size="sm" variant="primary" icon={ShieldCheck} loading={approving} disabled={hasApproved || stale} onClick={onApprove}>
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
          {stale ? (
            <p role="alert" className="mb-4 rounded-lg bg-warning-bg p-3 text-sm text-warning">
              This article changed since you opened it. Close and reopen the preview to review the latest version.
            </p>
          ) : null}
          {article.placementLabel ? (
            <p className="mb-4 rounded-lg border border-border bg-bg p-3 text-sm">
              <span className="font-semibold">Placed in learning track:</span> {article.placementLabel}
            </p>
          ) : null}
          {article.kind === "track" && article.deleting ? (
            <p role="alert" className="mb-4 rounded-lg bg-danger-bg p-3 text-sm font-semibold text-danger">
              This request deletes the whole track below from the website. Blogs placed in it stay published as normal blogs.
            </p>
          ) : null}
          {article.kind === "track" && article.track ? (
            <div className="rounded-xl border border-border bg-white p-5 text-black">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Learning track proposal · /tracks/{article.slug}</p>
              <h2 className="mt-1 text-2xl font-black">{article.track.title}</h2>
              {article.track.summary ? <p className="mt-1 text-neutral-600">{article.track.summary}</p> : null}
              <div className="mt-5">
                <TrackView track={article.track} vertical={article.vertical} slug={article.slug || "preview"} placed={{}} readOnly />
              </div>
              <p className="mt-4 text-xs text-neutral-500">Blogs placed in each section by their authors appear after its links and videos on the live page.</p>
            </div>
          ) : null}
          {article.kind === "track" && !article.track ? (
            <div role="alert" className="rounded-lg bg-danger-bg p-4 text-sm text-danger">
              <p className="font-semibold">This track proposal is invalid and can&apos;t be approved. Request changes so the author can fix it:</p>
              <ul className="mt-2 list-disc pl-5">
                {(article.trackErrors || []).slice(0, 6).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {article.kind === "track" ? null : <ArticlePreview
            authorName={article.author}
            authorLogin={pr?.author || article.author}
            authorAvatar={pr?.authorAvatar}
            selectedVertical={article.vertical}
            title={article.title}
            coverImage={article.coverImage || ""}
            html={html}
            summary={article.summary}
            tags={article.tags}
          />}
        </div>
      ) : null}
    </Drawer>
  );
}
