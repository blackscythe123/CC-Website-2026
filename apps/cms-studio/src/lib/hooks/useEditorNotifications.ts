"use client";

import { useEffect, useState } from "react";
import type { UserRoleInfo } from "@/lib/roles";
import type { UserProfile } from "@/lib/hooks/useStudioSession";

export interface AuthorPendingPr {
  number: number;
  title: string;
  vertical: string;
  createdAt: string;
}

export interface AuthorFeedbackPr {
  number: number;
  title: string;
  feedback: string;
  vertical: string;
  branch?: string;
}

interface ReviewPr {
  number: number;
  title: string;
  author: string;
  vertical: string;
  createdAt: string;
  changesRequested?: boolean;
  latestFeedback?: string;
}

/**
 * Derives the editor's notification banners from the open review PRs:
 * the author's PRs under review, the latest change request on the author's PRs,
 * and (for reviewers) how many PRs are waiting on them.
 */
export function useEditorNotifications(user: UserProfile | null, roleInfo: UserRoleInfo | null) {
  const [authorPendingPrs, setAuthorPendingPrs] = useState<AuthorPendingPr[]>([]);
  const [reviewerPendingCount, setReviewerPendingCount] = useState(0);
  const [authorFeedbackPr, setAuthorFeedbackPr] = useState<AuthorFeedbackPr | null>(null);

  useEffect(() => {
    if (!user) return;
    const login = user.login.toLowerCase();

    fetch("/api/posts/reviews")
      .then((r) => r.json())
      .then((rData) => {
        if (!rData.prs) return;
        const prs: ReviewPr[] = rData.prs;

        // 1. Author's PRs with feedback requested
        const myPrWithFeedback = prs.find(
          (p) => p.author.toLowerCase() === login && p.changesRequested && p.latestFeedback
        );
        if (myPrWithFeedback) {
          setAuthorFeedbackPr({
            number: myPrWithFeedback.number,
            title: myPrWithFeedback.title,
            feedback: myPrWithFeedback.latestFeedback || "",
            vertical: myPrWithFeedback.vertical,
          });
        }

        // 2. Author's PRs currently under review
        setAuthorPendingPrs(
          prs
            .filter((p) => p.author.toLowerCase() === login && !p.changesRequested)
            .map((p) => ({ number: p.number, title: p.title, vertical: p.vertical, createdAt: p.createdAt }))
        );

        // 3. For reviewers: PRs waiting for their review
        if (roleInfo?.role === "superadmin" || roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy") {
          const forReviewer = prs.filter((p) => {
            if (p.changesRequested) return false; // Waiting on author to revise
            if (p.author.toLowerCase() === login) return false;
            if (roleInfo.role === "superadmin") return true;
            return roleInfo.verticals.includes(p.vertical);
          });
          setReviewerPendingCount(forReviewer.length);
        }
      })
      .catch(() => {});
  }, [user, roleInfo]);

  return { authorPendingPrs, reviewerPendingCount, authorFeedbackPr, setAuthorFeedbackPr };
}
