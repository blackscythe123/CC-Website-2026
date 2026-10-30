"use client";

import { CircleCheck, ExternalLink, FolderGit2 } from "lucide-react";
import Link from "next/link";
import { Button, Dialog, EmptyState, Skeleton, buttonClasses } from "@/components/ui";
import { NoDrafts } from "@/components/illustrations";

export interface RemoteDraftSummary {
  branch: string;
  slug: string;
  vertical: string;
  title: string;
  updatedAt: string;
}

export function SubmissionSuccessDialog({
  result,
  onClose,
}: {
  result: { pullNumber: number; prUrl: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(result)}
      onClose={onClose}
      title="Submitted for review"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep writing
          </Button>
          <Link href="/admin/reviews" className={buttonClasses({ variant: "primary" })}>
            Go to Reviews
          </Link>
        </>
      }
    >
      {result ? (
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              Your post is on a draft branch and opened as <strong>pull request #{result.pullNumber}</strong>. A reviewer for the vertical
              will approve it or ask for changes — you&apos;ll see it in your inbox.
            </p>
            <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
              View PR #{result.pullNumber} on GitHub
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

export function CloudDraftsDialog({
  open,
  login,
  drafts,
  loading,
  onLoad,
  onClose,
}: {
  open: boolean;
  login: string;
  drafts: RemoteDraftSummary[];
  loading: boolean;
  onLoad: (branch: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Open a draft from GitHub"
      description={
        <>
          Drafts you synced to your personal branches (<code className="font-mono text-xs">drafts/{login}/…</code>). Open one to continue on this device.
        </>
      }
    >
      {loading ? (
        <div className="space-y-2" aria-busy>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState illustration={NoDrafts} title="No synced drafts yet" body="Use Sync to GitHub (Ctrl+S) while writing to keep a copy you can open anywhere." />
      ) : (
        <ul className="space-y-2">
          {drafts.map((d) => (
            <li key={d.branch} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <FolderGit2 className="h-5 w-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold capitalize">{d.title}</div>
                <div className="truncate font-mono text-xs text-muted">
                  {d.branch} · {new Date(d.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <Button size="sm" onClick={() => onLoad(d.branch)}>
                Open
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
