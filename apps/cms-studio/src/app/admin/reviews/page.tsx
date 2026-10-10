"use client";

import { useState, useEffect } from "react";
import StudioNav from "@/components/StudioNav";
import { UserRoleInfo } from "@/lib/roles";
import {
  CheckCircle,
  GitPullRequest,
  ExternalLink,
  ShieldCheck,
  Clock,
  User,
  AlertCircle,
  Sparkles,
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

  const handleApproveAndMerge = async (pr: PendingPR) => {
    setMergingPrNumber(pr.number);
    setActionMessage("");
    setActionError("");

    try {
      const res = await fetch("/api/posts/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pullNumber: pr.number,
          vertical: pr.vertical,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve and merge PR");
      }

      setActionMessage(data.message || `PR #${pr.number} merged and published to main!`);
      // Refresh list
      fetchReviews();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error merging PR");
    } finally {
      setMergingPrNumber(null);
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
              Review incoming drafts submitted by club members, vertical heads, and core teams.
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
              const canApprove =
                roleInfo?.role === "superadmin" ||
                ((roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy") &&
                  roleInfo.verticals.includes(pr.vertical));

              return (
                <div
                  key={pr.number}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                          {pr.vertical}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          PR #{pr.number}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock className="h-3 w-3" />
                          <span>Pending Review</span>
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        {pr.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>GitHub Diff</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      {canApprove ? (
                        <button
                          onClick={() => handleApproveAndMerge(pr)}
                          disabled={mergingPrNumber === pr.number}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>
                            {mergingPrNumber === pr.number
                              ? "Merging..."
                              : "Approve & Merge to Main"}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Awaiting {pr.vertical} Head approval
                        </span>
                      )}
                    </div>
                  </div>

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
      </main>
    </div>
  );
}
