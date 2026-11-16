"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useStudio } from "@/components/shell/StudioContext";
import { useToast } from "@/components/toast/ToastProvider";
import { approvalTarget } from "@/lib/governance";
import { authorRoleIn, reviewProgress } from "@/lib/reviewProgress";
import { readApiJson } from "@/lib/hooks/apiClient";
import type { ReviewPr } from "@/lib/hooks/useReviewQueue";
import { Button, ConfirmDialog, EmptyState, Skeleton, TabPanel, Tabs } from "@/components/ui";
import { AllCaughtUp, NoDrafts } from "@/components/illustrations";
import ReviewCard from "@/components/reviews/ReviewCard";
import ReviewPreviewDrawer, { type PreviewArticle } from "@/components/reviews/ReviewPreviewDrawer";
import RequestChangesDialog from "@/components/reviews/RequestChangesDialog";

type TabId = "needs" | "changes" | "mine";

const STALE_MESSAGE = "This article changed since you opened it — reopen the preview to review the latest version";

export default function ReviewsPage() {
  const { user, roleInfo, queue } = useStudio();
  const toast = useToast();
  const login = user.login.toLowerCase();
  const isReviewer = roleInfo?.role === "superadmin" || roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy";

  // Role lists (loaded by the queue hook for reviewers) tell us each author's role.
  const roles = queue.roles;
  // Same predicate as the inbox / "Needs my review" / sidebar badge: role in the PR's vertical + the author's role.
  const canReview = (pr: ReviewPr) => queue.canReview(pr);

  const lists = useMemo(() => {
    const changes = queue.prs.filter((p) => p.changesRequested && p.author.toLowerCase() !== login);
    return { needs: queue.needsMyReview, changes, mine: queue.mine };
  }, [queue.prs, queue.mine, queue.needsMyReview, login]);

  const [tab, setTab] = useState<TabId>("needs");
  useEffect(() => {
    if (!isReviewer) setTab("mine");
  }, [isReviewer]);

  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewArticle | null>(null);
  const [changesFor, setChangesFor] = useState<ReviewPr | null>(null);
  const [sendingChanges, setSendingChanges] = useState(false);
  const [withdrawing, setWithdrawing] = useState<ReviewPr | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const canWithdraw = (pr: ReviewPr) =>
    pr.author.toLowerCase() === login || roleInfo?.role === "superadmin" || roleInfo?.rolesByVertical?.[pr.vertical] === "vertical_head";

  const withdraw = async () => {
    if (!withdrawing) return;
    setWithdrawBusy(true);
    try {
      const { ok, data } = await readApiJson(
        await fetch("/api/posts/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pullNumber: withdrawing.number }),
        })
      );
      if (!ok) throw new Error(data.error || "Couldn't withdraw this request");
      toast.success(data.message || `PR #${withdrawing.number} withdrawn`);
      setWithdrawing(null);
      setPreview(null);
      await queue.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't withdraw this request");
    } finally {
      setWithdrawBusy(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await queue.refresh();
    setRefreshing(false);
  };

  const progressFor = (pr: ReviewPr) => {
    const authorRole =
      pr.author.toLowerCase() === login
        ? roleInfo?.rolesByVertical?.[pr.vertical] ?? roleInfo?.role ?? null
        : authorRoleIn(roles, pr.author, pr.vertical);
    return reviewProgress(authorRole, pr.approvers, roles ? roles.deputies[pr.vertical] || [] : null);
  };

  /** The head commit the reviewer saw: the open preview's if it is for this PR, else the list item's. */
  const seenHeadSha = (pr: ReviewPr) => (preview && preview.pullNumber === pr.number && preview.headSha ? preview.headSha : pr.headSha);

  /** 409 = the PR changed since it was opened: say so and reload the queue. */
  const handleStale = async () => {
    toast.error(STALE_MESSAGE);
    setPreview(null);
    setChangesFor(null);
    await queue.refresh();
  };

  const approve = async (pr: ReviewPr) => {
    const expectedHeadSha = seenHeadSha(pr);
    if (!expectedHeadSha) {
      toast.error(STALE_MESSAGE);
      return;
    }
    setApproving(pr.number);
    try {
      const res = await fetch("/api/posts/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullNumber: pr.number, action: "approve", expectedHeadSha }),
      });
      const { ok, status, data } = await readApiJson(res);
      if (status === 409) return await handleStale();
      if (!ok) throw new Error(data.error || "Couldn't approve this post");
      toast.success(data.message || `Approval recorded for PR #${pr.number}`);
      setPreview(null);
      await queue.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't approve this post");
    } finally {
      setApproving(null);
    }
  };

  const openPreview = async (pr: ReviewPr) => {
    setPreviewing(pr.number);
    try {
      const res = await fetch(`/api/posts/reviews?previewPullNumber=${pr.number}`);
      const { ok, data } = await readApiJson(res);
      if (!ok || !data.article) throw new Error(data.error || "Couldn't load the article");
      setPreview(data.article);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load the article");
    } finally {
      setPreviewing(null);
    }
  };

  const sendChanges = async (reason: string) => {
    if (!changesFor) return;
    const expectedHeadSha = seenHeadSha(changesFor);
    if (!expectedHeadSha) {
      toast.error(STALE_MESSAGE);
      return;
    }
    setSendingChanges(true);
    try {
      const res = await fetch("/api/posts/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullNumber: changesFor.number, action: "reject", reason, expectedHeadSha }),
      });
      const { ok, status, data } = await readApiJson(res);
      if (status === 409) return await handleStale();
      if (!ok) throw new Error(data.error || "Couldn't send the feedback");
      toast.success(data.message || `Changes requested on PR #${changesFor.number}`);
      setChangesFor(null);
      setPreview(null);
      await queue.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the feedback");
    } finally {
      setSendingChanges(false);
    }
  };

  const tabs = [
    { id: "needs", label: "Needs my review", shortLabel: "To review", count: lists.needs.length },
    { id: "changes", label: "Changes requested", shortLabel: "Changes", count: lists.changes.length },
    { id: "mine", label: "Mine", count: lists.mine.length },
  ];
  const current = lists[tab];
  const previewPr = preview ? queue.prs.find((p) => p.number === preview.pullNumber) : undefined;
  // The queue moved on (new commits) while the preview was open: reviewing it would be reviewing an old version.
  const previewStale = Boolean(preview?.headSha && previewPr?.headSha && preview.headSha !== previewPr.headSha);

  const empty =
    tab === "needs" ? (
      <EmptyState illustration={AllCaughtUp} title="All caught up" body="Nothing in your verticals is waiting for your review." />
    ) : tab === "changes" ? (
      <EmptyState illustration={AllCaughtUp} title="No posts waiting on authors" body="Posts you've asked to change show up here until the author pushes revisions." />
    ) : (
      <EmptyState illustration={NoDrafts} title="You have no posts in review" body="Submit a post from the editor and it will show up here while reviewers look at it." />
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden text-2xl font-extrabold tracking-tight md:block">Reviews</h1>
          <p className="mt-1 text-sm text-muted">
            {isReviewer
              ? `${lists.needs.length} ${lists.needs.length === 1 ? "post is" : "posts are"} waiting on you. Member posts need ${approvalTarget("member").label}.`
              : "Your posts that are waiting for a reviewer or need changes."}
          </p>
        </div>
        <Button size="sm" icon={RefreshCw} loading={refreshing} onClick={refresh}>
          Refresh
        </Button>
      </header>

      <div className="mt-5">
        {isReviewer ? <Tabs ariaLabel="Review lists" idPrefix="reviews" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs} /> : null}
        <TabPanel id={tab} idPrefix="reviews">
          {queue.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : current.length === 0 ? (
            empty
          ) : (
            <div className="space-y-3">
              {current.map((pr) => (
                <ReviewCard
                  key={pr.number}
                  pr={pr}
                  progress={progressFor(pr)}
                  isMine={pr.author.toLowerCase() === login}
                  canReview={canReview(pr)}
                  hasApproved={pr.approvers.some((a) => a.toLowerCase() === login)}
                  approving={approving === pr.number}
                  previewing={previewing === pr.number}
                  onPreview={() => openPreview(pr)}
                  onApprove={() => approve(pr)}
                  onRequestChanges={() => setChangesFor(pr)}
                  onWithdraw={canWithdraw(pr) ? () => setWithdrawing(pr) : undefined}
                />
              ))}
            </div>
          )}
        </TabPanel>
      </div>

      <ReviewPreviewDrawer
        article={preview}
        pr={previewPr}
        canReview={previewPr ? canReview(previewPr) : false}
        isMine={previewPr ? previewPr.author.toLowerCase() === login : false}
        hasApproved={previewPr ? previewPr.approvers.some((a) => a.toLowerCase() === login) : false}
        stale={previewStale}
        approving={previewPr ? approving === previewPr.number : false}
        onClose={() => setPreview(null)}
        onApprove={() => previewPr && approve(previewPr)}
        onRequestChanges={() => previewPr && setChangesFor(previewPr)}
      />
      <RequestChangesDialog pr={changesFor} submitting={sendingChanges} onCancel={() => setChangesFor(null)} onSubmit={sendChanges} />
      <ConfirmDialog
        open={withdrawing !== null}
        title={`Withdraw PR #${withdrawing?.number ?? ""}?`}
        confirmLabel="Withdraw"
        loading={withdrawBusy}
        onCancel={() => setWithdrawing(null)}
        onConfirm={withdraw}
        message={
          <p>
            “{withdrawing?.title}” is closed without being published and its draft branch is deleted. Nothing on the website changes. Copy anything you want to keep first.
          </p>
        }
      />
    </div>
  );
}
