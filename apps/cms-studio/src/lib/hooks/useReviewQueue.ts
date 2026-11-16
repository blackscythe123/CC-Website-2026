"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserRoleInfo } from "@/lib/roles";
import type { UserProfile } from "@/lib/hooks/useStudioSession";
import { canReviewPr } from "@/lib/governance";
import { authorRoleIn, type RoleLists } from "@/lib/reviewProgress";
import { readApiJson } from "@/lib/hooks/apiClient";

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
  /** Head commit the list data describes; sent back as expectedHeadSha when approving / rejecting. */
  headSha: string;
  /** Users whose latest decisive review approved the current head (server-defined). */
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

/** Whether this user holds a reviewing role anywhere (and so may read the role lists). */
export function isReviewerRole(roleInfo: UserRoleInfo | null): boolean {
  if (!roleInfo) return false;
  if (roleInfo.role === "superadmin") return true;
  return Object.values(roleInfo.rolesByVertical ?? {}).some((r) => r === "vertical_head" || r === "deputy");
}

/**
 * Open review PRs for the signed-in user plus everything derived from them:
 * inbox notifications, how many PRs wait on this reviewer, and the author's own PRs.
 */
export function useReviewQueue(user: UserProfile | null, roleInfo: UserRoleInfo | null) {
  const [prs, setPrs] = useState<ReviewPr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleLists | null>(null);
  const reviewer = isReviewerRole(roleInfo);

  // Reviewers can read the role lists, which tells us each author's role (approval authority + progress badge).
  useEffect(() => {
    if (!user || !reviewer) return;
    let cancelled = false;
    fetch("/api/roles")
      .then((r) => readApiJson(r))
      .then(({ ok, data }) => {
        if (!cancelled && ok && data.roles) setRoles(data.roles as RoleLists);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, reviewer]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/posts/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load reviews");
      setPrs(
        (data.prs || []).map((p: Partial<ReviewPr>) => ({
          ...p,
          headSha: p.headSha || "",
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
    // ONE predicate for buttons, "Needs my review", the inbox and the sidebar badge (see canReviewPr).
    const canReview = (p: ReviewPr) =>
      Boolean(user && roleInfo) &&
      canReviewPr({ login: user!.login, role: roleInfo!.role, rolesByVertical: roleInfo!.rolesByVertical }, p, authorRoleIn(roles, p.author, p.vertical));

    const inbox: InboxItem[] = [];
    for (const pr of prs) {
      if (isMine(pr)) {
        inbox.push({ number: pr.number, title: pr.title, vertical: pr.vertical, type: pr.changesRequested ? "changes_requested" : "submitted" });
      } else if (!pr.changesRequested && canReview(pr)) {
        inbox.push({ number: pr.number, title: pr.title, vertical: pr.vertical, type: "needs_approval" });
      }
    }

    const needsMyReview = prs.filter((p) => !p.changesRequested && !isMine(p) && canReview(p));
    const mine = prs.filter(isMine);

    return {
      canReview,
      inbox,
      needsMyReview,
      needsMyReviewCount: needsMyReview.length,
      mine,
      mySubmitted: mine.filter((p) => !p.changesRequested),
      myChangesRequested: mine.find((p) => p.changesRequested && p.latestFeedback) || null,
      attentionCount: inbox.filter((i) => i.type !== "submitted").length,
    };
  }, [prs, user, roleInfo, roles]);

  return { prs, loading, error, refresh, roles, ...derived };
}

export type ReviewQueue = ReturnType<typeof useReviewQueue>;
