"use client";

import { useState, useEffect } from "react";
import StudioNav from "@/components/StudioNav";
import { UserRoleInfo } from "@/lib/roles";
import { marked } from "marked";
import {
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  User,
  AlertCircle,
  XCircle,
  MessageSquare,
  X,
  Users,
  Eye,
  FileText,
  Sparkles,
  Edit3,
} from "lucide-react";

interface PendingPR {
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  vertical: string;
  createdAt: string;
  htmlUrl: string;
  body: string;
  branch: string;
  approvers?: string[];
  changesRequested?: boolean;
  latestFeedback?: string;
  reviews?: { user: string; state: string; body: string; date: string }[];
}

interface PreviewArticleData {
  title: string;
  markdownBody: string;
  coverImage?: string;
  author: string;
  vertical: string;
  summary?: string;
  tags?: string[];
  pullNumber: number;
}

export default function EditorialReviewsPage() {
  const [user, setUser] = useState<{ login: string; name: string; avatar_url: string } | null>(
    null
  );
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [prs, setPrs] = useState<PendingPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [mergingPrNumber, setMergingPrNumber] = useState<number | null>(null);

  // Article Preview Modal State
  const [previewArticle, setPreviewArticle] = useState<PreviewArticleData | null>(null);
  const [loadingPreviewNumber, setLoadingPreviewNumber] = useState<number | null>(null);

  // Rejection / Changes Requested Modal State
  const [rejectModalPr, setRejectModalPr] = useState<PendingPR | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchReviews = () => {
    fetch("/api/posts/reviews")
      .then((res) => res.json())
      .then((data) => {
        if (data.prs) {
          setPrs(data.prs);
        }
        if (data.roleInfo) {
          setRoleInfo(data.roleInfo);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setRoleInfo(data.roleInfo);
          fetchReviews();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApprove = async (pr: PendingPR) => {
    setMergingPrNumber(pr.number);
    setActionMessage("");
    setActionError("");

    try {
      const res = await fetch("/api/posts/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pullNumber: pr.number,
          action: "approve",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process approval");
      }

      setActionMessage(data.message || `Approval recorded for PR #${pr.number}!`);
      fetchReviews();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error processing approval");
    } finally {
      setMergingPrNumber(null);
    }
  };

  const handleOpenPreview = async (prNumber: number) => {
    setLoadingPreviewNumber(prNumber);
    setActionError("");
    try {
      const res = await fetch(`/api/posts/reviews?previewPullNumber=${prNumber}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load article preview");
      }
      setPreviewArticle(data.article);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error fetching article preview");
    } finally {
      setLoadingPreviewNumber(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalPr || !rejectReason.trim()) return;

    setSubmittingReject(true);
    setActionMessage("");
    setActionError("");

    try {
      const res = await fetch("/api/posts/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pullNumber: rejectModalPr.number,
          action: "reject",
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request changes");
      }

      setActionMessage(data.message || `Changes requested on PR #${rejectModalPr.number}.`);
      setRejectModalPr(null);
      setRejectReason("");
      fetchReviews();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error requesting changes");
    } finally {
      setSubmittingReject(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                Editorial Pipeline
              </span>
              <span className="text-xs text-gray-400">Zero-Database Git Workflow</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Editorial Approvals &amp; PRs
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Governance rule: <strong>Member posts require 2 Deputy approvals OR 1 Vertical Head OR 1 Superadmin</strong>.
            </p>
          </div>

          <button
            onClick={fetchReviews}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
          >
            Refresh PRs
          </button>
        </div>

        {/* Action Alerts */}
        {actionMessage && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* PR Cards List */}
        {prs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800">All caught up!</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              There are no pending editorial pull requests waiting for review in your jurisdiction.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {prs.map((pr) => {
              const canReview =
                roleInfo?.role === "superadmin" ||
                ((roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy") &&
                  roleInfo.verticals.includes(pr.vertical));

              const hasApproved =
                user && pr.approvers?.map((a) => a.toLowerCase()).includes(user.login.toLowerCase());

              return (
                <div
                  key={pr.number}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                          {pr.vertical}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          PR #{pr.number}
                        </span>
                        {pr.changesRequested ? (
                          <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3" />
                            <span>Changes Requested</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Clock className="h-3 w-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {pr.approvers && pr.approvers.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <Users className="h-3 w-3" />
                            <span>{pr.approvers.length} approval{pr.approvers.length > 1 ? "s" : ""}</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        {pr.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenPreview(pr.number)}
                        disabled={loadingPreviewNumber === pr.number}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>
                          {loadingPreviewNumber === pr.number ? "Loading Preview..." : "Preview Article"}
                        </span>
                      </button>

                      <a
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>GitHub Diff</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      {/* Author revision action when changes are requested */}
                      {user && pr.author.toLowerCase() === user.login.toLowerCase() && pr.changesRequested && (
                        <a
                          href={`/admin?revise=${pr.number}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Load &amp; Revise Article</span>
                        </a>
                      )}

                      {canReview && (
                        <>
                          <button
                            onClick={() => {
                              setRejectModalPr(pr);
                              setRejectReason("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Request Changes</span>
                          </button>

                          <button
                            onClick={() => handleApprove(pr)}
                            disabled={mergingPrNumber === pr.number || Boolean(hasApproved)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>
                              {mergingPrNumber === pr.number
                                ? "Processing..."
                                : hasApproved
                                ? "Approved by You"
                                : "Approve Post"}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Changes Requested Feedback Banner */}
                  {pr.changesRequested && pr.latestFeedback && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Editorial Feedback / Required Changes:</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-amber-950 font-sans">
                        {pr.latestFeedback}
                      </p>
                    </div>
                  )}

                  {/* Approver Badges */}
                  {pr.approvers && pr.approvers.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Approvals recorded:</span>
                      {pr.approvers.map((u) => (
                        <span
                          key={u}
                          className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800"
                        >
                          @{u}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Author and Date byline */}
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      {pr.authorAvatar ? (
                        <img
                          src={pr.authorAvatar}
                          alt={pr.author}
                          className="h-5 w-5 rounded-full"
                        />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-gray-800">@{pr.author}</span>
                    </div>
                    <span>•</span>
                    <span>Branch: <code className="font-mono">{pr.branch}</code></span>
                    <span>•</span>
                    <span>Created: {new Date(pr.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rejection / Request Changes Modal */}
        {rejectModalPr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                  <XCircle className="h-5 w-5" />
                  <span>Request Changes on PR #{rejectModalPr.number}</span>
                </div>
                <button
                  onClick={() => setRejectModalPr(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Provide clear, actionable feedback for the author (@{rejectModalPr.author}). This feedback
                will be posted directly as a review comment on the GitHub PR and visible in their studio dashboard.
              </p>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Feedback Reason / Corrections Required
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Please update the cover banner to high resolution and elaborate on section 3..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 shadow-xs focus:border-red-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setRejectModalPr(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReject || !rejectReason.trim()}
                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {submittingReject ? "Posting Feedback..." : "Submit Changes Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Full Article Preview Modal */}
        {previewArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100">
              {/* Modal Top Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold uppercase tracking-wider text-blue-700">
                    {previewArticle.vertical}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 font-medium">Staging Preview (PR #{previewArticle.pullNumber})</span>
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const matchedPr = prs.find((p) => p.number === previewArticle.pullNumber);
                    const canReview =
                      roleInfo?.role === "superadmin" ||
                      ((roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy") &&
                        roleInfo.verticals.includes(previewArticle.vertical));

                    return (
                      <>
                        {canReview && matchedPr && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalPr(matchedPr);
                                setRejectReason("");
                                setPreviewArticle(null);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Request Changes</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleApprove(matchedPr);
                                setPreviewArticle(null);
                              }}
                              disabled={mergingPrNumber === matchedPr.number}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Approve &amp; Publish</span>
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setPreviewArticle(null)}
                    className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition ml-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Article Content */}
              <div className="overflow-y-auto p-6 sm:p-10 space-y-6">
                {previewArticle.coverImage && (
                  <div className="overflow-hidden rounded-2xl shadow-sm border border-gray-100">
                    <img
                      src={previewArticle.coverImage}
                      alt={previewArticle.title}
                      className="h-64 sm:h-96 w-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
                    {previewArticle.title}
                  </h1>

                  <div className="flex items-center gap-3 border-y border-gray-100 py-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">By {previewArticle.author}</span>
                    <span>•</span>
                    <span>Vertical: {previewArticle.vertical.toUpperCase()}</span>
                    {previewArticle.tags && previewArticle.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Tags: {previewArticle.tags.join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>

                {previewArticle.summary && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 italic border-l-4 border-blue-500">
                    {previewArticle.summary}
                  </div>
                )}

                <div
                  className="article-preview text-gray-800 pt-4"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(previewArticle.markdownBody || "") as string,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
