"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Link2, ListPlus, Plus, Send, SquarePlay, Trash2, X } from "lucide-react";
import TrackView from "@coding-club/content-render/track-view";
import { parseYouTubeUrl } from "@coding-club/content-render";
import { validateTrack } from "@coding-club/content-schema/tracks";
import { Button, ConfirmDialog, Field, IconButton, Input, Select, Textarea } from "@/components/ui";
import { clearTrackDraft, getTrackDraft, saveTrackDraft } from "@/lib/draftStorage";
import {
  emptyItem,
  emptySubtopic,
  emptyTopic,
  humanizeTrackError,
  moved,
  slugFromTitle,
  toTrack,
  type EditItem,
  type EditSubtopic,
  type EditTopic,
  type EditTrack,
} from "@/lib/trackEditor";

export interface TrackEditorTarget {
  vertical: string;
  verticalName: string;
  mode: "create" | "edit";
  /** Fixed for edits and PR revisions; chosen by the user for a new track. */
  slug: string | null;
  initial: EditTrack;
  /** Blogs placed per section on main: { "<topicId>" | "<topicId>/<subId>": n } */
  placedCounts: Record<string, number>;
  pullNumber?: number;
  headSha?: string;
}

type PendingRemove = { label: string; placed: number; run: () => void } | null;

function itemProblem(i: EditItem): string | null {
  if (!i.title.trim()) return "Add a title.";
  if (i.type === "video") return parseYouTubeUrl(i.url.trim()) ? null : "Paste a YouTube video or playlist link.";
  try {
    const u = new URL(i.url.trim());
    return u.protocol === "https:" && !u.username && !u.password ? null : "Use an https:// link.";
  } catch {
    return "Paste a full https:// link.";
  }
}

function ItemsEditor({
  items,
  onChange,
  idPrefix,
  moveTargets = [],
  onMoveTo,
}: {
  items: EditItem[];
  onChange: (items: EditItem[]) => void;
  idPrefix: string;
  /** Other topics/subtopics this resource can be moved to (keeps its id, so readers' ticks survive). */
  moveTargets?: { key: string; label: string }[];
  onMoveTo?: (index: number, targetKey: string) => void;
}) {
  const update = (index: number, patch: Partial<EditItem>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const problem = itemProblem(it);
        const base = `${idPrefix}-item-${it.key}`;
        return (
          <div key={it.key} className="rounded-lg border border-border bg-bg p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                {it.type === "video" ? <SquarePlay className="h-3 w-3" aria-hidden /> : <Link2 className="h-3 w-3" aria-hidden />}
                {it.type === "video" ? "Video" : "Link"}
              </span>
              <span className="flex-1" />
              <IconButton size="sm" icon={ArrowUp} label="Move up" disabled={i === 0} onClick={() => onChange(moved(items, i, -1))} />
              <IconButton size="sm" icon={ArrowDown} label="Move down" disabled={i === items.length - 1} onClick={() => onChange(moved(items, i, 1))} />
              {onMoveTo && moveTargets.length ? (
                <>
                  <label htmlFor={`${base}-move`} className="sr-only">
                    Move to another section
                  </label>
                  <select
                    id={`${base}-move`}
                    value=""
                    onChange={(e) => e.target.value && onMoveTo(i, e.target.value)}
                    className="h-7 max-w-[11rem] rounded-md border border-border bg-bg px-1.5 text-[12px] text-muted"
                  >
                    <option value="">Move to…</option>
                    {moveTargets.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              <IconButton size="sm" icon={X} tone="danger" label="Remove this resource" onClick={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Title" htmlFor={`${base}-title`}>
                <Input id={`${base}-title`} value={it.title} maxLength={120} onChange={(e) => update(i, { title: e.target.value })} placeholder={it.type === "video" ? "e.g. Sliding window in 10 minutes" : "e.g. Two Sum"} />
              </Field>
              <Field label={it.type === "video" ? "YouTube link" : "Link"} htmlFor={`${base}-url`} error={it.url.trim() || it.title.trim() ? problem : null}>
                <Input id={`${base}-url`} value={it.url} maxLength={500} inputMode="url" onChange={(e) => update(i, { url: e.target.value })} placeholder="https://…" />
              </Field>
              {it.type === "link" ? (
                <Field label="Difficulty" htmlFor={`${base}-difficulty`}>
                  <Select id={`${base}-difficulty`} value={it.difficulty} onChange={(e) => update(i, { difficulty: e.target.value as EditItem["difficulty"] })}>
                    <option value="">None</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </Field>
              ) : null}
              <Field label="Description" htmlFor={`${base}-desc`} counter={{ value: it.description.length, max: 500 }} className={it.type === "link" ? "" : "sm:col-span-2"}>
                <Textarea id={`${base}-desc`} rows={2} value={it.description} maxLength={500} onChange={(e) => update(i, { description: e.target.value })} placeholder="Optional — why this, or what to look for" />
              </Field>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={Link2} onClick={() => onChange([...items, emptyItem("link")])}>
          Add link
        </Button>
        <Button size="sm" icon={SquarePlay} onClick={() => onChange([...items, emptyItem("video")])}>
          Add video
        </Button>
      </div>
    </div>
  );
}

function SectionFields({
  section,
  onChange,
  idPrefix,
  label,
}: {
  section: EditSubtopic;
  onChange: (patch: Partial<EditSubtopic>) => void;
  idPrefix: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Field label={`${label} title`} htmlFor={`${idPrefix}-title`}>
        <Input id={`${idPrefix}-title`} value={section.title} maxLength={120} onChange={(e) => onChange({ title: e.target.value })} placeholder={label === "Topic" ? "e.g. Arrays & Hashing" : "e.g. Sliding window"} />
      </Field>
      <Field label="Description" htmlFor={`${idPrefix}-desc`} counter={{ value: section.description.length, max: 1000 }}>
        <Textarea id={`${idPrefix}-desc`} rows={2} value={section.description} maxLength={1000} onChange={(e) => onChange({ description: e.target.value })} placeholder="Optional — what this section covers and how to approach it" />
      </Field>
    </div>
  );
}

/**
 * Create or edit a learning track: topics → subtopics, each with links/videos and descriptions.
 * Blogs join sections from the blog editor ("Where does this go?"), so this form only shows how many
 * are placed in each section and warns before removing one.
 */
export default function TrackEditor({
  target,
  login,
  submitting,
  onSubmit,
  onCancel,
  onDelete,
}: {
  target: TrackEditorTarget;
  login: string;
  submitting: boolean;
  onSubmit: (slug: string, track: ReturnType<typeof toTrack>) => void;
  onCancel: () => void;
  /** Shown for published tracks: request deleting the whole track. */
  onDelete?: () => void;
}) {
  const draftKey = `${target.vertical}/${target.pullNumber ? `pr-${target.pullNumber}` : target.slug || "new"}`;
  const [edit, setEdit] = useState<EditTrack>(target.initial);
  const [slug, setSlug] = useState(target.slug || "");
  const [slugTouched, setSlugTouched] = useState(Boolean(target.slug));
  const [preview, setPreview] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<PendingRemove>(null);
  const [restore, setRestore] = useState<{ value: { edit: EditTrack; slug: string }; updatedAt: number } | null>(null);
  const loaded = useRef(false);

  // Offer unsaved local changes for this track, then autosave edits to this device.
  useEffect(() => {
    let cancelled = false;
    getTrackDraft<{ edit: EditTrack; slug: string }>(login, draftKey).then((stored) => {
      if (cancelled) return;
      if (stored && JSON.stringify(stored.value.edit) !== JSON.stringify(target.initial)) setRestore(stored);
      loaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [login, draftKey, target.initial]);
  useEffect(() => {
    if (!loaded.current || restore) return;
    const t = setTimeout(() => void saveTrackDraft(login, draftKey, { edit, slug }), 800);
    return () => clearTimeout(t);
  }, [edit, slug, login, draftKey, restore]);

  const effectiveSlug = slugTouched ? slug : slugFromTitle(edit.title);
  const track = useMemo(() => toTrack(edit, target.vertical), [edit, target.vertical]);
  const result = useMemo(() => validateTrack(track, { vertical: target.vertical, slug: effectiveSlug || "x" }), [track, target.vertical, effectiveSlug]);
  const itemProblems = edit.topics.flatMap((t) => [...t.items, ...t.subtopics.flatMap((s) => s.items)]).map(itemProblem).filter(Boolean);
  const problems = [
    ...(!effectiveSlug ? ["Give the track a short name for its web address."] : []),
    ...(itemProblems.length ? [`${itemProblems.length} resource${itemProblems.length === 1 ? " needs" : "s need"} a title and a valid link.`] : []),
    // Resource problems are already summarised above; show the schema's other errors in plain words.
    ...(result.ok ? [] : result.errors.filter((e) => !/\.items\.\d+\./.test(e) || !itemProblems.length).slice(0, 4).map(humanizeTrackError)),
  ];

  const setTopic = (ti: number, patch: Partial<EditTopic>) => setEdit((e) => ({ ...e, topics: e.topics.map((t, i) => (i === ti ? { ...t, ...patch } : t)) }));
  const setSub = (ti: number, si: number, patch: Partial<EditSubtopic>) =>
    setTopic(ti, { subtopics: edit.topics[ti].subtopics.map((s, i) => (i === si ? { ...s, ...patch } : s)) });

  const placedIn = (topic: EditTopic, sub?: EditSubtopic) => {
    if (!topic.id) return 0;
    if (sub) return sub.id ? target.placedCounts[`${topic.id}/${sub.id}`] || 0 : 0;
    return Object.entries(target.placedCounts).reduce((n, [k, v]) => (k === topic.id || k.startsWith(`${topic.id}/`) ? n + v : n), 0);
  };
  // Every topic/subtopic, for "Move to…" (by row key; ids are assigned at submit for new sections).
  const sectionTargets = edit.topics.flatMap((t, ti) => [
    { key: t.key, label: t.title || `Topic ${ti + 1}` },
    ...t.subtopics.map((s, si) => ({ key: s.key, label: `${t.title || `Topic ${ti + 1}`} › ${s.title || `Subtopic ${si + 1}`}` })),
  ]);
  const moveItem = (fromKey: string, index: number, toKey: string) =>
    setEdit((e) => {
      let moving: EditItem | undefined;
      const take = (items: EditItem[]) => {
        moving = items[index];
        return items.filter((_, i) => i !== index);
      };
      const topics = e.topics.map((t) =>
        t.key === fromKey
          ? { ...t, items: take(t.items) }
          : { ...t, subtopics: t.subtopics.map((s) => (s.key === fromKey ? { ...s, items: take(s.items) } : s)) }
      );
      if (!moving) return e;
      const item = moving;
      return {
        ...e,
        topics: topics.map((t) =>
          t.key === toKey
            ? { ...t, items: [...t.items, item] }
            : { ...t, subtopics: t.subtopics.map((s) => (s.key === toKey ? { ...s, items: [...s.items, item] } : s)) }
        ),
      };
    });

  const askRemove = (label: string, placed: number, run: () => void) => {
    if (placed === 0 && !label) return run();
    setPendingRemove({ label, placed, run });
  };

  const submit = async () => {
    if (problems.length) return;
    await clearTrackDraft(login, draftKey).catch(() => {});
    onSubmit(effectiveSlug, track);
  };

  return (
    <div className="space-y-5">
      {restore ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-bg p-3 text-sm text-warning">
          <span className="flex-1">You have unsaved changes to this track from {new Date(restore.updatedAt).toLocaleString()}.</span>
          <Button
            size="sm"
            onClick={() => {
              setEdit(restore.value.edit);
              if (!target.slug) {
                setSlug(restore.value.slug);
                setSlugTouched(Boolean(restore.value.slug));
              }
              setRestore(null);
            }}
          >
            Restore
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void clearTrackDraft(login, draftKey);
              setRestore(null);
            }}
          >
            Discard
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={Eye} aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
          {preview ? "Back to editing" : "Preview"}
        </Button>
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" icon={Send} loading={submitting} disabled={problems.length > 0} onClick={submit}>
          {target.pullNumber ? `Update PR #${target.pullNumber}` : "Submit for review"}
        </Button>
      </div>

      {problems.length ? (
        <ul role="alert" className="list-disc space-y-0.5 rounded-lg bg-danger-bg py-2 pl-8 pr-3 text-[13px] text-danger">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      {preview ? (
        <div className="rounded-xl border border-border bg-white p-5 text-black">
          <h2 className="text-2xl font-black">{track.title || "Untitled track"}</h2>
          {track.summary ? <p className="mt-1 text-neutral-600">{track.summary}</p> : null}
          <div className="mt-5">
            <TrackView track={track} vertical={target.vertical} slug={effectiveSlug || "preview"} placed={{}} readOnly />
          </div>
          <p className="mt-4 text-xs text-neutral-500">Blogs placed in each section appear after its links and videos on the live page.</p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 rounded-xl border border-border bg-surface p-4">
            <Field label="Track title" htmlFor="track-title">
              <Input id="track-title" value={edit.title} maxLength={120} onChange={(e) => setEdit((x) => ({ ...x, title: e.target.value }))} placeholder="e.g. DSA Sheet, Internship Prep" />
            </Field>
            <Field
              label="Short name"
              htmlFor="track-slug"
              hint={
                target.slug
                  ? "Can't be changed after publishing (readers' progress and comments use it)."
                  : `Web address: ${target.verticalName} portal /tracks/${effectiveSlug || "…"}`
              }
            >
              <Input
                id="track-slug"
                value={effectiveSlug}
                maxLength={60}
                disabled={Boolean(target.slug)}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
              />
            </Field>
            <Field label="Summary" htmlFor="track-summary" counter={{ value: edit.summary.length, max: 300 }}>
              <Textarea id="track-summary" rows={2} value={edit.summary} maxLength={300} onChange={(e) => setEdit((x) => ({ ...x, summary: e.target.value }))} placeholder="One or two sentences on who this track is for" />
            </Field>
          </section>

          {edit.topics.map((topic, ti) => {
            const tp = `topic-${topic.key}`;
            const placed = placedIn(topic);
            return (
              <section key={topic.key} aria-label={`Topic ${ti + 1}`} className="space-y-3 rounded-xl border border-border-strong bg-surface p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Topic {ti + 1}</h3>
                  {placed ? <span className="text-[12px] text-muted">· {placed} blog{placed === 1 ? "" : "s"} placed here</span> : null}
                  <span className="flex-1" />
                  <IconButton size="sm" icon={ArrowUp} label="Move topic up" disabled={ti === 0} onClick={() => setEdit((e) => ({ ...e, topics: moved(e.topics, ti, -1) }))} />
                  <IconButton size="sm" icon={ArrowDown} label="Move topic down" disabled={ti === edit.topics.length - 1} onClick={() => setEdit((e) => ({ ...e, topics: moved(e.topics, ti, 1) }))} />
                  <IconButton
                    size="sm"
                    icon={Trash2}
                    tone="danger"
                    label="Remove topic"
                    disabled={edit.topics.length === 1}
                    onClick={() => askRemove(topic.title || `Topic ${ti + 1}`, placed, () => setEdit((e) => ({ ...e, topics: e.topics.filter((_, i) => i !== ti) })))}
                  />
                </div>
                <SectionFields section={topic} idPrefix={tp} label="Topic" onChange={(patch) => setTopic(ti, patch)} />
                <ItemsEditor
                  items={topic.items}
                  idPrefix={tp}
                  onChange={(items) => setTopic(ti, { items })}
                  moveTargets={sectionTargets.filter((x) => x.key !== topic.key)}
                  onMoveTo={(i, to) => moveItem(topic.key, i, to)}
                />

                {topic.subtopics.map((sub, si) => {
                  const sp = `${tp}-sub-${sub.key}`;
                  const subPlaced = placedIn(topic, sub);
                  return (
                    <div key={sub.key} className="ml-2 space-y-3 border-l-2 border-border pl-4 sm:ml-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-bold">Subtopic {si + 1}</h4>
                        {subPlaced ? <span className="text-[12px] text-muted">· {subPlaced} blog{subPlaced === 1 ? "" : "s"} placed here</span> : null}
                        <span className="flex-1" />
                        <IconButton size="sm" icon={ArrowUp} label="Move subtopic up" disabled={si === 0} onClick={() => setTopic(ti, { subtopics: moved(topic.subtopics, si, -1) })} />
                        <IconButton size="sm" icon={ArrowDown} label="Move subtopic down" disabled={si === topic.subtopics.length - 1} onClick={() => setTopic(ti, { subtopics: moved(topic.subtopics, si, 1) })} />
                        <IconButton
                          size="sm"
                          icon={Trash2}
                          tone="danger"
                          label="Remove subtopic"
                          onClick={() => askRemove(sub.title || `Subtopic ${si + 1}`, subPlaced, () => setTopic(ti, { subtopics: topic.subtopics.filter((_, i) => i !== si) }))}
                        />
                      </div>
                      <SectionFields section={sub} idPrefix={sp} label="Subtopic" onChange={(patch) => setSub(ti, si, patch)} />
                      <ItemsEditor
                        items={sub.items}
                        idPrefix={sp}
                        onChange={(items) => setSub(ti, si, { items })}
                        moveTargets={sectionTargets.filter((x) => x.key !== sub.key)}
                        onMoveTo={(i, to) => moveItem(sub.key, i, to)}
                      />
                    </div>
                  );
                })}
                <Button size="sm" icon={ListPlus} variant="ghost" onClick={() => setTopic(ti, { subtopics: [...topic.subtopics, emptySubtopic()] })}>
                  Add subtopic
                </Button>
              </section>
            );
          })}
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={Plus} onClick={() => setEdit((e) => ({ ...e, topics: [...e.topics, emptyTopic()] }))}>
              Add topic
            </Button>
            <span className="flex-1" />
            {onDelete ? (
              <Button variant="danger" icon={Trash2} onClick={onDelete}>
                Delete this track…
              </Button>
            ) : null}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`Remove “${pendingRemove?.label ?? ""}”?`}
        confirmLabel="Remove"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          pendingRemove?.run();
          setPendingRemove(null);
        }}
        message={
          pendingRemove?.placed ? (
            <p>
              {pendingRemove.placed === 1
                ? "1 published blog is placed here. After this change is approved it drops out of the track until it's moved to another section (it stays published as a normal blog)."
                : `${pendingRemove.placed} published blogs are placed here. After this change is approved they drop out of the track until they're moved to another section (they stay published as normal blogs).`}
            </p>
          ) : (
            <p>Its links, videos and description are removed from the track when you submit.</p>
          )
        }
      />
    </div>
  );
}
