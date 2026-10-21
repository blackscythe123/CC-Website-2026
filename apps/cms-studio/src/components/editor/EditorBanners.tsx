"use client";

import { AlertCircle, AlertTriangle, Sparkles } from "lucide-react";
import type { AuthorFeedbackPr, AuthorPendingPr } from "@/lib/hooks/useEditorNotifications";

export function RecoveredDraftBanner({
  updatedAt,
  onRestore,
  onDiscard,
}: {
  updatedAt: number | string;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm text-xs text-amber-900">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold text-amber-950">⚡ Unsaved Local Draft Recovered!</span>
            <p className="text-amber-800 mt-0.5">
              An unsaved draft from {new Date(updatedAt).toLocaleTimeString()} was saved in browser storage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRestore}
            className="rounded-xl bg-amber-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-amber-700 transition"
          >
            Restore Draft
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 transition"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthorPendingBanner({ prs }: { prs: AuthorPendingPr[] }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm text-xs text-blue-900">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shrink-0">
            📬
          </div>
          <div>
            <span className="font-bold text-blue-950">
              Review Requested: You have {prs.length} article{prs.length > 1 ? "s" : ""} under Editorial Review
            </span>
            <div className="text-blue-800 mt-1 space-y-0.5">
              {prs.map((pr) => (
                <div key={pr.number} className="flex items-center gap-2">
                  <span>•</span>
                  <span>
                    <strong>PR #{pr.number}</strong> &ldquo;{pr.title}&rdquo; in
                  </span>
                  <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                    {pr.vertical}
                  </span>
                  <span className="text-blue-600 text-[11px]">(Awaiting Reviewer Approval)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/admin/reviews"
            className="rounded-xl bg-blue-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Track in Reviews &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export function ReviewerActionBanner({ count }: { count: number }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm text-xs text-emerald-900">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shrink-0">
            ⚡
          </div>
          <div>
            <span className="font-bold text-emerald-950">
              Editorial Action Required: {count} article{count > 1 ? "s" : ""} awaiting your sign-off
            </span>
            <p className="text-emerald-800 mt-0.5">
              Articles have been submitted for your vertical. Review, test, and approve or request revisions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/admin/reviews"
            className="rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            Review Articles ({count}) &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export function UnassignedMemberBanner({ login }: { login: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-xs text-xs text-amber-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-amber-950 text-sm">
              Role Assignment Required
            </span>
            <p className="text-amber-800 mt-0.5">
              You are signed in as <strong>@{login}</strong>, but have not been assigned to any of the 8 technical verticals yet. You can write and save drafts locally, but you must be assigned a role before submitting posts.
            </p>
          </div>
        </div>
        <a
          href="/admin/roles"
          className="rounded-xl bg-amber-600 px-3.5 py-2 font-bold text-white shadow-xs hover:bg-amber-700 transition shrink-0"
        >
          Request Role ↗
        </a>
      </div>
    </div>
  );
}

export function ChangesRequestedBanner({
  pr,
  loading,
  onRevise,
}: {
  pr: AuthorFeedbackPr;
  loading: boolean;
  onRevise: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm text-xs text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-950">
              ⚠️ Editorial Feedback on PR #{pr.number}: &ldquo;{pr.title}&rdquo;
            </div>
            <p className="text-red-800 mt-1 whitespace-pre-wrap font-sans">
              <strong>Revision Required:</strong> {pr.feedback}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={onRevise}
            disabled={loading}
            className="rounded-xl bg-red-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Draft & Revise"}
          </button>
        </div>
      </div>
    </div>
  );
}
