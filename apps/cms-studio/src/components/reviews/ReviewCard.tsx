"use client";

import Link from "next/link";
import { Check, CircleAlert, ExternalLink, Eye, GitPullRequestArrow, MessageSquare, ShieldCheck } from "lucide-react";
import type { ReviewPr } from "@/lib/hooks/useReviewQueue";
import { verticalLabel } from "@/lib/verticals";
import { Avatar, Badge, Button, VerticalIcon, buttonClasses } from "@/components/ui";

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

export interface ReviewCardProps {
  pr: ReviewPr;
  progress: { text: string; tone: "success" | "neutral"; title?: string };
  isMine: boolean;
  canReview: boolean;
  hasApproved: boolean;
  approving: boolean;
  previewing: boolean;
  onPreview: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}

export default function ReviewCard({ pr, progress, isMine, canReview, hasApproved, approving, previewing, onPreview, onApprove, onRequestChanges }: ReviewCardProps) {
  return (
    <article className="rounded-xl border border-border bg-bg p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Badge tone="info">
          <VerticalIcon slug={pr.vertical} className="h-3 w-3" />
          {verticalLabel(pr.vertical)}
        </Badge>
        {pr.changesRequested ? (
          <Badge tone="warning" icon={CircleAlert}>
            Changes requested
          </Badge>
        ) : null}
        <span className="min-w-0 truncate text-[13px] text-muted">
          #{pr.number} · @{pr.author} · {timeAgo(pr.createdAt)}
        </span>
        <span className="flex-1" />
        <Badge tone={progress.tone} icon={progress.tone === "success" ? Check : undefined} title={progress.title}>
          {progress.text}
        </Badge>
      </div>

      {/* On phones the title opens the review drawer, where the actions live */}
      <h3 className="mt-2.5 text-base font-bold leading-snug tracking-tight sm:text-[17px]">
        <button type="button" onClick={onPreview} className="text-left hover:underline sm:pointer-events-none sm:no-underline">
          {pr.title}
        </button>
      </h3>

      {pr.changesRequested && pr.latestFeedback ? (
        <div className="mt-3 flex gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-sm text-warning">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 whitespace-pre-wrap leading-relaxed">{pr.latestFeedback}</p>
        </div>
      ) : null}

      {pr.approvers.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <span>Approved by</span>
          {pr.approvers.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-0.5 pr-2 text-xs font-medium text-text">
              <Avatar login={a} size={18} />@{a}
            </span>
          ))}
        </div>
      ) : null}

      <Button size="sm" block icon={Eye} loading={previewing} onClick={onPreview} className="mt-4 sm:hidden">
        {canReview ? "Open review" : "Open"}
      </Button>

      <div className="mt-4 hidden flex-wrap items-center justify-between gap-2 sm:flex">
        <div className="flex gap-2">
          <Button size="sm" icon={Eye} loading={previewing} onClick={onPreview}>
            Preview
          </Button>
          <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm", variant: "ghost" })}>
            GitHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
        <div className="ml-auto flex gap-2">
          {isMine && pr.changesRequested ? (
            <Link href={`/admin?revise=${pr.number}`} className={buttonClasses({ size: "sm", variant: "primary" })}>
              <GitPullRequestArrow className="h-4 w-4" aria-hidden />
              Load &amp; revise
            </Link>
          ) : null}
          {canReview ? (
            <>
              <Button size="sm" onClick={onRequestChanges}>
                Request changes
              </Button>
              <Button size="sm" variant="primary" icon={ShieldCheck} loading={approving} disabled={hasApproved} onClick={onApprove}>
                {hasApproved ? "Approved by you" : "Approve"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
