"use client";

import { AlertTriangle, Check, Cloud, CloudUpload, Columns, Edit3, Eye, Image as ImageIcon, Send } from "lucide-react";
import type { VerticalOption } from "@/lib/verticals";

export type ViewMode = "write" | "split" | "preview";

interface EditorToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isUnassignedMember: boolean;
  availableVerticals: VerticalOption[];
  selectedVertical: string;
  onVerticalChange: (slug: string) => void;
  pendingImageCount: number;
  lastSavedAt: string | null;
  isSavingDraft: boolean;
  isSavingRemoteDraft: boolean;
  onOpenCloudDrafts: () => void;
  onSaveRemoteDraft: () => void;
  revisionPrNumber: number | null;
  onOpenPublish: () => void;
}

const VIEW_MODES: { mode: ViewMode; label: string; ariaLabel: string; title: string; icon: typeof Edit3 }[] = [
  { mode: "write", label: "Write", ariaLabel: "Write", title: "Canvas Editor only", icon: Edit3 },
  { mode: "split", label: "Split", ariaLabel: "Split view", title: "Split screen: write & see real-time preview side-by-side", icon: Columns },
  { mode: "preview", label: "Preview", ariaLabel: "Preview", title: "Full live reading preview", icon: Eye },
];

export default function EditorToolbar({
  viewMode,
  onViewModeChange,
  isUnassignedMember,
  availableVerticals,
  selectedVertical,
  onVerticalChange,
  pendingImageCount,
  lastSavedAt,
  isSavingDraft,
  isSavingRemoteDraft,
  onOpenCloudDrafts,
  onSaveRemoteDraft,
  revisionPrNumber,
  onOpenPublish,
}: EditorToolbarProps) {
  return (
    <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
      <div className={`mx-auto flex ${viewMode === "split" ? "max-w-7xl" : "max-w-4xl"} flex-wrap items-center justify-between gap-x-4 gap-y-2 transition-all duration-200`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Vertical:</span>
          {isUnassignedMember ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Unassigned (Draft Only)
            </span>
          ) : (
            <select
              value={selectedVertical}
              onChange={(e) => onVerticalChange(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              {availableVerticals.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <span className="hidden sm:inline">•</span>
          <span className="text-amber-600 font-medium hidden sm:inline">Requires Approval</span>
          {pendingImageCount > 0 && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 font-semibold text-purple-700">
                <ImageIcon className="h-3 w-3" />
                {pendingImageCount} image{pendingImageCount > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-2.5">
          {/* View Mode Segmented Pill */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-medium shadow-xs">
            {VIEW_MODES.map(({ mode, label, ariaLabel, title, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                  viewMode === mode
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title={title}
                aria-label={ariaLabel}
                aria-pressed={viewMode === mode}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Cloud Drafts / Cross-Device Sync Button */}
          <button
            type="button"
            onClick={onOpenCloudDrafts}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition"
            title="View and restore drafts saved to GitHub branches across devices"
            aria-label="Cloud Drafts"
          >
            <Cloud className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden md:inline">Cloud Drafts</span>
          </button>

          {/* Save to Cloud Branch (Zero-DB Remote Persistence) */}
          <div className="flex items-center gap-1.5">
            {lastSavedAt && (
              <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>{lastSavedAt}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onSaveRemoteDraft}
              disabled={isSavingRemoteDraft || isSavingDraft || isUnassignedMember}
              aria-label={isSavingRemoteDraft ? "Syncing draft" : "Save Draft"}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-400 transition active:scale-95 disabled:opacity-50"
              title={
                isUnassignedMember
                  ? "You must be assigned to a vertical in Governance & Roles before syncing cloud drafts"
                  : "Push WIP draft to your personal Git draft branch (drafts/username/slug) so you can resume on another device"
              }
            >
              <CloudUpload className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">{isSavingRemoteDraft ? "Syncing..." : "Save Draft"}</span>
            </button>
          </div>

          {isUnassignedMember ? (
            <a
              href="/admin/roles"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-300 px-3.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-500/25 transition"
              title="You must be assigned to a vertical in Governance & Roles before submitting articles"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="sm:hidden">Request Role</span>
              <span className="hidden sm:inline">Request Role to Publish</span>
            </a>
          ) : revisionPrNumber ? (
            <button
              onClick={onOpenPublish}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
            >
              <span>Update PR #{revisionPrNumber}</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={onOpenPublish}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Publish / Submit</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
