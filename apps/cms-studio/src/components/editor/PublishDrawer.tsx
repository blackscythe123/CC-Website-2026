"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleDashed, GitPullRequest, Info, Send, X } from "lucide-react";
import type { VerticalOption } from "@/lib/verticals";
import { getVertical } from "@/lib/verticals";
import { getSubmitChecklist, type ChecklistItem } from "@/lib/submitChecklist";
import { addTag } from "@/lib/tags";
import { Button, Drawer, Field, Input, Select, Textarea } from "@/components/ui";

const SUMMARY_SOFT_LIMIT = 200;
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function ChecklistRow({ item, verticalName }: { item: ChecklistItem; verticalName: string }) {
  const Icon = item.ok ? CircleCheck : item.level === "required" ? CircleAlert : item.level === "recommended" ? CircleAlert : CircleDashed;
  const tone = item.ok ? "text-success" : item.level === "required" ? "text-danger" : item.level === "recommended" ? "text-warning" : "text-subtle";
  const label = item.id === "vertical" && item.ok ? `Vertical: ${verticalName}` : item.label;
  const note = item.ok ? null : item.level === "required" ? item.hint || "Required" : item.hint;
  return (
    <li className="flex items-start gap-2 py-1 text-sm">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      <span>
        {label}
        <span className="sr-only">{item.ok ? " — done" : item.level === "required" ? " — required" : ` — ${item.level}`}</span>
        {note ? <span className="text-muted"> — {note}</span> : null}
      </span>
    </li>
  );
}

interface PublishDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  coverImage: string;
  availableVerticals: VerticalOption[];
  selectedVertical: string;
  onVerticalChange: (slug: string) => void;
  summary: string;
  onSummaryChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  revision: { number: number; feedback: string } | null;
  submitting: boolean;
  serverError: string | null;
  onSubmit: () => void;
}

export default function PublishDrawer(props: PublishDrawerProps) {
  const { open, onClose, availableVerticals, selectedVertical, summary, tags, revision, submitting } = props;
  const [tagInput, setTagInput] = useState("");

  const checklist = getSubmitChecklist({
    title: props.title,
    content: props.content,
    summary,
    coverImage: props.coverImage,
    selectedVertical,
    allowedVerticals: availableVerticals.map((v) => v.slug),
  });
  const vertical = getVertical(selectedVertical);

  const commitTag = () => {
    props.onTagsChange(addTag(tags, tagInput));
    setTagInput("");
  };

  const footer = (
    <div className="space-y-2">
      {!checklist.canSubmit ? <p className="text-center text-[13px] font-medium text-danger">{checklist.blockingReason}</p> : null}
      <Button
        variant="primary"
        size="lg"
        block
        icon={revision ? GitPullRequest : Send}
        loading={submitting}
        disabled={!checklist.canSubmit}
        onClick={props.onSubmit}
      >
        {submitting ? (revision ? "Pushing revisions…" : "Submitting…") : revision ? `Push revisions to PR #${revision.number}` : "Submit for review"}
        {!submitting ? (
          <kbd className="ml-1 hidden rounded border border-white/50 px-1 text-[11px] font-medium sm:inline">{isMac ? "⌘" : "Ctrl"} ↵</kbd>
        ) : null}
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title={revision ? `Update PR #${revision.number}` : "Submit for review"} footer={footer}>
      <div className="space-y-5 px-5 py-5">
        {props.serverError ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg p-3 text-sm text-danger">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{props.serverError}</span>
          </div>
        ) : null}

        {revision?.feedback ? (
          <div className="rounded-lg bg-warning-bg p-3 text-sm text-warning">
            <p className="font-semibold">Reviewer feedback</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{revision.feedback}</p>
          </div>
        ) : null}

        <section aria-labelledby="checklist-title" className="rounded-xl border border-border bg-surface px-4 py-3">
          <h3 id="checklist-title" className="text-[13px] font-bold">
            {checklist.canSubmit ? "Ready to submit" : "Before you submit"}
          </h3>
          <ul className="mt-1.5">
            {checklist.items.map((item) => (
              <ChecklistRow key={item.id} item={item} verticalName={vertical?.name || selectedVertical} />
            ))}
          </ul>
        </section>

        <Field
          label="Vertical"
          htmlFor="publish-vertical"
          hint={
            vertical ? (
              <>
                Publishes to <strong className="text-text">{vertical.domain}</strong>
                {vertical.slug !== "club" ? " and codingclub.tech" : ""}
              </>
            ) : undefined
          }
        >
          <Select id="publish-vertical" value={selectedVertical} onChange={(e) => props.onVerticalChange(e.target.value)}>
            {availableVerticals.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Summary"
          htmlFor="publish-summary"
          hint={summary.length > SUMMARY_SOFT_LIMIT ? "Long summaries get cut off on cards" : "Recommended — shown on cards and link previews"}
          counter={{ value: summary.length, max: SUMMARY_SOFT_LIMIT }}
        >
          <Textarea
            id="publish-summary"
            rows={3}
            value={summary}
            onChange={(e) => props.onSummaryChange(e.target.value)}
            placeholder="Two sentences on what readers will learn…"
          />
        </Field>

        <Field label="Tags" htmlFor="publish-tags" hint="Press Enter or comma to add a tag">
          <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-bg px-2 py-1.5 focus-within:border-accent">
            {tags.map((t) => (
              <span key={t} className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-2.5 pr-1 text-xs font-semibold">
                <span className="truncate">#{t}</span>
                <button
                  type="button"
                  onClick={() => props.onTagsChange(tags.filter((x) => x !== t))}
                  aria-label={`Remove tag ${t}`}
                  className="rounded-full p-0.5 text-muted hover:bg-bg hover:text-danger"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
            <Input
              id="publish-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitTag();
                } else if (e.key === "Backspace" && !tagInput && tags.length) {
                  props.onTagsChange(tags.slice(0, -1));
                }
              }}
              onBlur={commitTag}
              placeholder={tags.length ? "Add another…" : "e.g. nextjs, redis"}
              className="h-7 min-w-[8rem] flex-1 border-none px-1 shadow-none focus:border-none"
            />
          </div>
        </Field>

        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Submitting opens a pull request on a draft branch. A deputy, head or superadmin must approve it before it goes live — even superadmins need another reviewer.
        </p>
      </div>
    </Drawer>
  );
}
