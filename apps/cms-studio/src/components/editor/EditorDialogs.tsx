"use client";

import { CheckCircle2, Cloud, ExternalLink, X } from "lucide-react";

export interface RemoteDraftSummary {
  branch: string;
  slug: string;
  vertical: string;
  title: string;
  updatedAt: string;
}

export function SubmissionSuccessModal({
  pullNumber,
  prUrl,
  onClose,
}: {
  pullNumber: number;
  prUrl: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Submitted for Editorial Review!</h3>
          <p className="mt-2 text-sm text-gray-500">
            Your post has been committed to a draft branch and opened as Pull Request{" "}
            <span className="font-bold text-gray-800">#{pullNumber}</span> on
            GitHub.
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 text-left space-y-1">
          <div>
            <strong>Governance Rule:</strong> A designated Vertical Head or Superadmin will
            review and merge this PR on the Editorial Reviews page before it goes live.
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span>View PR #{pullNumber} on GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="/admin/reviews"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Go to Editorial Reviews Dashboard &rarr;
          </a>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 pt-1"
          >
            Close & Continue Writing
          </button>
        </div>
      </div>
    </div>
  );
}

export function CloudDraftsModal({
  login,
  drafts,
  loading,
  onLoad,
  onClose,
}: {
  login: string | undefined;
  drafts: RemoteDraftSummary[];
  loading: boolean;
  onLoad: (branch: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-gray-900">Your Cloud Git Drafts</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          These are unmerged WIP drafts pushed to personal branches (<code>drafts/{login}/*</code>). You can open and continue them on any device without losing work.
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400 font-mono">
            Querying GitHub draft branches...
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400">
            No cloud draft branches found for @{login}. Click <strong>&quot;Save Draft&quot;</strong> in the toolbar to save your first cloud copy!
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {drafts.map((d) => (
              <div
                key={d.branch}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs hover:border-blue-400 transition"
              >
                <div>
                  <div className="font-semibold text-gray-900 capitalize">{d.title}</div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {d.branch} • {new Date(d.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onLoad(d.branch)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-2xs hover:bg-blue-700 transition"
                >
                  Load Draft
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl text-xs font-semibold text-emerald-800 animate-slide-up">
      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      <span>{message}</span>
    </div>
  );
}
