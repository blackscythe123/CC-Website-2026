"use client";

import { useEffect, useRef } from "react";
import { CloudUpload, Columns2, Eye, GitPullRequest, PenLine, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import type { VerticalOption } from "@/lib/verticals";
import type { SaveState } from "@/lib/saveStatus";
import { Button, Select, VerticalIcon, buttonClasses } from "@/components/ui";
import DraftsMenu from "./DraftsMenu";
import SaveStatusChip from "./SaveStatusChip";

export type ViewMode = "write" | "split" | "preview";

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Eye }[] = [
  { mode: "write", label: "Write", icon: PenLine },
  { mode: "split", label: "Split view", icon: Columns2 },
  { mode: "preview", label: "Preview", icon: Eye },
];

interface EditorToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isUnassignedMember: boolean;
  availableVerticals: VerticalOption[];
  selectedVertical: string;
  onVerticalChange: (slug: string) => void;
  saveState: SaveState;
  syncing: boolean;
  onSync: () => void;
  revisionPrNumber: number | null;
  onOpenPublish: () => void;
  onNewPost: () => void;
  onOpenFromGitHub: () => void;
  onStopRevising: () => void;
}

export default function EditorToolbar(props: EditorToolbarProps) {
  const {
    viewMode,
    onViewModeChange,
    isUnassignedMember,
    availableVerticals,
    selectedVertical,
    onVerticalChange,
    saveState,
    syncing,
    onSync,
    revisionPrNumber,
    onOpenPublish,
  } = props;

  // Lets the formatting bar stick just below this toolbar, whatever its height.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => document.documentElement.style.setProperty("--editor-toolbar-h", `${el.offsetHeight + 8}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={barRef} className="sticky top-14 z-30 border-b border-border bg-bg/95 backdrop-blur md:top-0">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <DraftsMenu
          revising={Boolean(revisionPrNumber)}
          onNewPost={props.onNewPost}
          onOpenFromGitHub={props.onOpenFromGitHub}
          onStopRevising={props.onStopRevising}
        />

        {isUnassignedMember ? (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-warning-bg px-2.5 text-[13px] font-semibold text-warning">
            <UserPlus className="h-4 w-4" aria-hidden />
            No vertical yet
          </span>
        ) : (
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-muted">
              <VerticalIcon slug={selectedVertical} />
            </span>
            <label htmlFor="editor-vertical" className="sr-only">
              Vertical
            </label>
            <Select
              id="editor-vertical"
              value={selectedVertical}
              onChange={(e) => onVerticalChange(e.target.value)}
              className="h-8 w-auto max-w-[13rem] pl-8 text-[13px] font-semibold"
            >
              {availableVerticals.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center">
          <SaveStatusChip state={saveState} />
        </div>

        <div className="flex items-center gap-2">
          <div role="group" aria-label="View" className="flex rounded-lg border border-border bg-surface p-0.5">
            {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                aria-label={label}
                aria-pressed={viewMode === mode}
                title={label}
                className={`flex h-7 w-8 items-center justify-center rounded-md transition ${
                  viewMode === mode ? "bg-bg text-text shadow-card" : "text-muted hover:text-text"
                } ${mode === "split" ? "hidden lg:flex" : ""}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            ))}
          </div>

          <Button
            size="sm"
            icon={CloudUpload}
            loading={syncing}
            disabled={isUnassignedMember}
            onClick={onSync}
            aria-label="Sync to GitHub"
            title={
              isUnassignedMember
                ? "You need a vertical role before syncing to GitHub"
                : "Save this draft to your personal GitHub branch to continue on another device (Ctrl+S)"
            }
          >
            <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync to GitHub"}</span>
          </Button>

          {isUnassignedMember ? (
            <Link href="/admin/roles" className={buttonClasses({ size: "sm", variant: "primary" })}>
              <UserPlus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Request a role</span>
              <span className="sm:hidden">Role</span>
            </Link>
          ) : (
            <Button size="sm" variant="primary" icon={revisionPrNumber ? GitPullRequest : Send} onClick={onOpenPublish} title="Open the publish panel (Ctrl+Enter)">
              {revisionPrNumber ? `Update PR #${revisionPrNumber}` : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
