"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserRoleInfo } from "@/lib/roles";
import type { UserProfile } from "@/lib/hooks/useStudioSession";

export interface ReviewPr {
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  vertical: string;
  createdAt: string;
  htmlUrl: string;
  body: string;
  branch: string;
  approvers: string[];
  changesRequested: boolean;
  latestFeedback: string;
  reviews: { user: string; state: string; body: string; date: string }[];
}

export interface InboxItem {
  number: number;
  title: string;
  vertical: string;
  type: "submitted" | "changes_requested" | "needs_approval";
}

function canReviewVertical(roleInfo: UserRoleInfo | null, vertical: string) {
  if (!roleInfo) return false;
  if (roleInfo.role === "superadmin") return true;
  return (roleInfo.role === "vertical_head" || roleInfo.role === "deputy") && roleInfo.verticals.includes(vertical);
}

/**
 * Open review PRs for the signed-in user plus everything derived from them:
 * inbox notifications, how many PRs wait on this reviewer, and the author's own PRs.
 */
export function useReviewQueue(user: UserProfile | null, roleInfo: UserRoleInfo | null) {
  const [prs, setPrs] = useState<ReviewPr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/posts/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load reviews");
      setPrs(
        (data.prs || []).map((p: Partial<ReviewPr>) => ({
          ...p,
          approvers: p.approvers || [],
          changesRequested: Boolean(p.changesRequested),
          latestFeedback: p.latestFeedback || "",
          reviews: p.reviews || [],
        }))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else setLoading(false);
  }, [user, refresh]);

  const derived = useMemo(() => {
    const login = user?.login.toLowerCase() || "";
    const isMine = (p: ReviewPr) => p.author.toLowerCase() === login;

    const inbox: InboxItem[] = [];
    for (const pr of prs) {
      if (isMine(pr)) {
        inbox.push({ number: pr.number, title: pr.title, vertical: pr.vertical, type: pr.changesRequested ? "changes_requested" : "submitted" });
      } else if (!pr.changesRequested && canReviewVertical(roleInfo, pr.vertical)) {
        inbox.push({ number: pr.number, title: pr.title, vertical: pr.vertical, type: "needs_approval" });
      }
    }

    const needsMyReview = prs.filter((p) => !p.changesRequested && !isMine(p) && canReviewVertical(roleInfo, p.vertical));
    const mine = prs.filter(isMine);

    return {
      inbox,
      needsMyReview,
      needsMyReviewCount: needsMyReview.length,
      mine,
      mySubmitted: mine.filter((p) => !p.changesRequested),
      myChangesRequested: mine.find((p) => p.changesRequested && p.latestFeedback) || null,
      attentionCount: inbox.filter((i) => i.type !== "submitted").length,
    };
  }, [prs, user, roleInfo]);

  return { prs, loading, error, refresh, ...derived };
}

export type ReviewQueue = ReturnType<typeof useReviewQueue>;
