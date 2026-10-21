"use client";

import { useState } from "react";
import { AlertCircle, Sparkles, X } from "lucide-react";
import type { VerticalOption } from "@/lib/verticals";

interface PublishDrawerProps {
  onClose: () => void;
  errorMessage: string;
  availableVerticals: VerticalOption[];
  selectedVertical: string;
  onVerticalChange: (slug: string) => void;
  summary: string;
  onSummaryChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  revisionPrNumber: number | null;
  submitting: boolean;
  onSubmit: () => void;
}

export default function PublishDrawer({
  onClose,
  errorMessage,
  availableVerticals,
  selectedVertical,
  onVerticalChange,
  summary,
  onSummaryChange,
  tags,
  onTagsChange,
  revisionPrNumber,
  submitting,
  onSubmit,
}: PublishDrawerProps) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,/, "");
      if (val && !tags.includes(val)) {
        onTagsChange([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (t: string) => {
    onTagsChange(tags.filter((item) => item !== t));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition">
      <div className="flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl sm:p-8">
        <div className="space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">Publishing Submission</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Vertical Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Article Vertical
            </label>
            <select
              value={selectedVertical}
              onChange={(e) => onVerticalChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 shadow-xs focus:border-blue-600 focus:outline-hidden"
            >
              {availableVerticals.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                </option>
              ))}
            </select>
            <div className="mt-2.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
              <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                <span>🎯 Target Portal:</span>
                <span className="font-mono text-blue-800">
                  {selectedVertical === "club"
                    ? "codingclub.tech (Main Portal)"
                    : `${selectedVertical}.codingclub.tech (${selectedVertical} Portal)`}
                </span>
              </div>
              <p className="text-blue-700/80 mt-1 text-[11px]">
                Autonomous 1-to-1 vertical routing. This article will live strictly inside its designated vertical portal and codebase.
              </p>
            </div>
          </div>

          {/* Summary / Subtitle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Article Summary / Excerpt
            </label>
            <textarea
              value={summary}
              onChange={(e) => onSummaryChange(e.target.value)}
              rows={3}
              placeholder="A concise 2-sentence teaser for cards and social previews..."
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 shadow-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Tags (Press Enter or Comma)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-red-600"
                    aria-label={`Remove tag ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="e.g. Nextjs, Turbopack, AI"
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 shadow-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Governance & Approval Policy Box */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Club Governance Workflow</span>
            </div>
            <p className="leading-relaxed text-blue-800">
              Submitting will create a dedicated Git draft branch and Pull Request. In
              accordance with club rules, even Superadmins must review and approve posts before
              they are merged to main.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
              revisionPrNumber
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {submitting
              ? "Pushing Revisions..."
              : revisionPrNumber
              ? `Update PR #${revisionPrNumber} with Revisions 🚀`
              : "Submit for Editorial Review 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
