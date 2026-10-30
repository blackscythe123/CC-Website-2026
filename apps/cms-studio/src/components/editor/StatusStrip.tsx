"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CircleAlert, GitPullRequestArrow, RotateCcw, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui";

export type StripState =
  | { kind: "recovered"; updatedAt: number; onRestore: () => void; onDiscard: () => void }
  | { kind: "revising"; number: number; title: string; feedback: string }
  | { kind: "changes-requested"; number: number; title: string; feedback: string; loading: boolean; onRevise: () => void }
  | { kind: "no-role" }
  | null;

const EDGE: Record<NonNullable<StripState>["kind"], string> = {
  recovered: "border-l-info",
  revising: "border-l-warning",
  "changes-requested": "border-l-danger",
  "no-role": "border-l-warning",
};

/** One notice above the editor at a time, most important first (spec §2.2). */
export default function StatusStrip({ state }: { state: StripState }) {
  const [feedbackOpen, setFeedbackOpen] = useState(true);
  if (!state) return null;

  return (
    <div className={`mx-auto mt-3 w-full max-w-4xl px-4 sm:px-6`}>
      <div className={`rounded-xl border border-border border-l-[3px] bg-bg px-4 py-3 shadow-card ${EDGE[state.kind]}`}>
        {state.kind === "recovered" ? (
          <div className="flex flex-wrap items-center gap-3">
            <RotateCcw className="h-4 w-4 shrink-0 text-info" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">Unsaved draft found on this device</span>{" "}
              <span className="text-muted">from {new Date(state.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={state.onRestore}>
                Restore
              </Button>
              <Button size="sm" variant="ghost" onClick={state.onDiscard}>
                Discard
              </Button>
            </div>
          </div>
        ) : null}

        {state.kind === "revising" ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GitPullRequestArrow className="h-4 w-4 shrink-0 text-warning" aria-hidden />
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">Revising PR #{state.number}</span>
                <span className="text-muted"> · {state.title}</span>
              </p>
              {state.feedback ? (
                <button
                  type="button"
                  onClick={() => setFeedbackOpen((o) => !o)}
                  aria-expanded={feedbackOpen}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] font-semibold text-accent hover:bg-accent-soft"
                >
                  {feedbackOpen ? "Hide feedback" : "Show feedback"}
                  {feedbackOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                </button>
              ) : null}
            </div>
            {state.feedback && feedbackOpen ? (
              <blockquote className="mt-2.5 whitespace-pre-wrap rounded-lg bg-warning-bg px-3 py-2 text-sm leading-relaxed text-warning">
                {state.feedback}
              </blockquote>
            ) : null}
          </div>
        ) : null}

        {state.kind === "changes-requested" ? (
          <div className="flex flex-wrap items-start gap-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <p>
                <span className="font-semibold">Changes requested on PR #{state.number}</span>
                <span className="text-muted"> · {state.title}</span>
              </p>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-muted">{state.feedback}</p>
            </div>
            <Button size="sm" variant="primary" loading={state.loading} onClick={state.onRevise}>
              Load &amp; revise
            </Button>
          </div>
        ) : null}

        {state.kind === "no-role" ? (
          <div className="flex flex-wrap items-center gap-3">
            <UserPlus className="h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">You don&apos;t have a vertical role yet.</span>{" "}
              <span className="text-muted">You can write and save on this device; you need a role to sync or submit.</span>
            </p>
            <Link href="/admin/roles" className={buttonClasses({ size: "sm" })}>
              Request a role
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
