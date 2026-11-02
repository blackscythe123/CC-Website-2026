"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { ALL_VERTICALS, CLUB_VERTICAL, getVertical } from "@/lib/verticals";
import { parseArticlePath, useArticleDraft } from "@/lib/hooks/useArticleDraft";
import { useStudio } from "@/components/shell/StudioContext";
import { useToast } from "@/components/toast/ToastProvider";
import { ConfirmDialog } from "@/components/ui";
import EditorToolbar, { type ViewMode } from "@/components/editor/EditorToolbar";
import EditorCanvas from "@/components/editor/EditorCanvas";
import ArticlePreview from "@/components/editor/ArticlePreview";
import PublishDrawer from "@/components/editor/PublishDrawer";
import StatusStrip, { type StripState } from "@/components/editor/StatusStrip";
import { CloudDraftsDialog, SubmissionSuccessDialog, type RemoteDraftSummary } from "@/components/editor/EditorDialogs";

interface RevisionPr {
  number: number;
  branch: string;
  title: string;
  feedback: string;
  /** The PR's existing article file (from the preview), so a revised title doesn't create a second .md. */
  filePath: string | null;
  slug: string | null;
  vertical: string | null;
}

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  run: () => void | Promise<void>;
}

export default function AdminEditorPage() {
  const { user, roleInfo, queue } = useStudio();
  const toast = useToast();

  const isSuperadmin = roleInfo?.role === "superadmin";
  const userVerticals = useMemo(() => roleInfo?.verticals ?? [], [roleInfo]);
  const availableVerticals = useMemo(
    () => (isSuperadmin ? [CLUB_VERTICAL, ...ALL_VERTICALS] : ALL_VERTICALS.filter((v) => userVerticals.includes(v.slug))),
    [isSuperadmin, userVerticals]
  );
  const isUnassignedMember = !isSuperadmin && availableVerticals.length === 0;

  const editor = useArticleDraft(userVerticals[0] || "ai-ml", user.login);
  const { draft, set } = editor;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("write");
  const [publishOpen, setPublishOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{ pullNumber: number; prUrl: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [remoteDrafts, setRemoteDrafts] = useState<RemoteDraftSummary[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [revision, setRevision] = useState<RevisionPr | null>(null);
  const [loadingRevision, setLoadingRevision] = useState(false);

  // While revising a PR the vertical is fixed by the PR's file path: only offer that one.
  const revisionVertical = revision?.vertical ? getVertical(revision.vertical) : undefined;
  const selectableVerticals = useMemo(() => (revisionVertical ? [revisionVertical] : availableVerticals), [revisionVertical, availableVerticals]);
  const changeVertical = useCallback(
    (v: string) => {
      if (revision?.vertical) return;
      set("selectedVertical", v);
    },
    [revision, set]
  );

  /** Ask before replacing unsaved work in the editor (same dialog "New post" uses). */
  const hasContent = editor.hasContent;
  const guardReplace = useCallback(
    (what: string, run: () => void | Promise<void>) => {
      if (!hasContent) {
        void run();
        return;
      }
      setPendingConfirm({
        title: `Replace the editor with ${what}?`,
        message: "The post in the editor will be replaced, including the copy saved on this device. Sync it to GitHub first if you want to keep it.",
        confirmLabel: "Replace",
        run,
      });
    },
    [hasContent]
  );

  // Keep the selected vertical one the user may post to.
  useEffect(() => {
    if (availableVerticals.length && !availableVerticals.some((v) => v.slug === draft.selectedVertical)) {
      set("selectedVertical", availableVerticals[0].slug);
    }
  }, [availableVerticals, draft.selectedVertical, set]);

  const parsedHtml = useMemo(() => {
    try {
      return sanitizeArticleHtml(marked.parse(draft.content || "*Start writing to see the preview…*", { gfm: true, breaks: true }) as string, {
        allowedImageUrls: draft.pendingImages.map((img) => img.placeholderUrl),
      });
    } catch {
      return "<p>Couldn't render this Markdown.</p>";
    }
  }, [draft.content, draft.pendingImages]);
  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const loadRevision = useCallback(
    async (prNumber: number, feedback = "") => {
      setLoadingRevision(true);
      try {
        const res = await fetch(`/api/posts/reviews?previewPullNumber=${prNumber}`);
        const data = await res.json();
        if (!res.ok || !data.article) throw new Error(data.error || `Couldn't load PR #${prNumber}`);
        const a = data.article;
        const filePath = typeof a.filePath === "string" ? a.filePath : null;
        const target = parseArticlePath(filePath);
        editor.loadFrom(
          {
            title: a.title || "",
            content: a.markdownBody || "",
            coverImage: a.coverImage || "",
            selectedVertical: target?.vertical || a.vertical,
            summary: a.summary || "",
            tags: a.tags || [],
          },
          `PR #${prNumber}`
        );
        const fromQueue = queue.mine.find((p) => p.number === prNumber);
        setRevision({
          number: prNumber,
          branch: a.branch,
          title: a.title || "",
          feedback: feedback || fromQueue?.latestFeedback || "",
          filePath,
          slug: target?.slug ?? null,
          vertical: target?.vertical ?? null,
        });
        setViewMode("write");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Couldn't load PR #${prNumber}`);
      } finally {
        setLoadingRevision(false);
      }
    },
    [editor, queue.mine, toast]
  );

  const requestRevision = useCallback(
    (prNumber: number, feedback = "") => guardReplace(`PR #${prNumber}`, () => loadRevision(prNumber, feedback)),
    [guardReplace, loadRevision]
  );

  // /admin?revise=<PR number> opens that PR for revision (used by Reviews and the inbox).
  // Tracks the handled number so a later inbox click (new ?revise) while on this page is honoured too.
  const reviseHandled = useRef<number | null>(null);
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("revise"));
    if (n > 0 && reviseHandled.current !== n) {
      reviseHandled.current = n;
      requestRevision(n);
    }
  }, [requestRevision]);

  const sync = useCallback(async () => {
    if (isUnassignedMember) {
      toast.info("You need a vertical role before syncing to GitHub.");
      return;
    }
    if (!draft.title.trim() && !draft.content.trim()) {
      toast.info("Write a title or some text before syncing.");
      return;
    }
    setSyncing(true);
    try {
      await editor.saveNow();
      const res = await fetch("/api/posts/drafts/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          markdownBody: draft.content,
          vertical: draft.selectedVertical,
          summary: draft.summary,
          tags: draft.tags,
          coverImage: draft.coverImage,
          pendingImages: draft.pendingImages.map(({ filename, base64, placeholderUrl }) => ({ filename, base64, placeholderUrl })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't sync to GitHub");
      editor.markSynced();
      toast.success(`Synced to GitHub · ${data.branch}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sync to GitHub");
    } finally {
      setSyncing(false);
    }
  }, [draft, editor, isUnassignedMember, toast]);

  const openDrafts = async () => {
    setDraftsOpen(true);
    setLoadingDrafts(true);
    try {
      const res = await fetch("/api/posts/drafts/remote");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load your drafts");
      setRemoteDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load your drafts");
    } finally {
      setLoadingDrafts(false);
    }
  };

  const openRemoteDraft = (branch: string) => guardReplace(branch, () => loadRemoteDraft(branch));

  const loadRemoteDraft = async (branch: string) => {
    setLoadingDrafts(true);
    try {
      const res = await fetch(`/api/posts/drafts/remote?branch=${encodeURIComponent(branch)}`);
      const data = await res.json();
      if (!res.ok || !data.draft) throw new Error(data.error || "Couldn't open that draft");
      const d = data.draft;
      editor.loadFrom(
        { title: d.title || "", content: d.markdownBody || "", coverImage: d.coverImage || "", selectedVertical: d.vertical, summary: d.summary || "", tags: d.tags || [] },
        branch
      );
      setRevision(null);
      setDraftsOpen(false);
      toast.info(`Opened ${branch}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open that draft");
    } finally {
      setLoadingDrafts(false);
    }
  };

  const startNewPost = async () => {
    await editor.reset();
    setRevision(null);
    setViewMode("write");
    toast.info("Started a new post");
  };

  const openPublish = () => {
    if (isUnassignedMember) {
      toast.info("You need a vertical role before submitting.");
      return;
    }
    setSubmitError(null);
    setPublishOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Revising: keep the PR's own vertical + slug so the existing file is updated, not duplicated.
          vertical: revision?.vertical || draft.selectedVertical,
          slug: revision?.slug || undefined,
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          coverImage: draft.coverImage,
          tags: draft.tags,
          markdownBody: draft.content,
          pendingImages: editor.activeImages(),
          pullNumber: revision?.number,
          existingBranch: revision?.branch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't submit the post");
      setPublishOpen(false);
      setSubmissionResult({ pullNumber: data.pullNumber, prUrl: data.prUrl });
      setRevision(null);
      await editor.reset();
      queue.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't submit the post";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const changeRequest = queue.myChangesRequested;
  const strip: StripState = editor.recovered
    ? { kind: "recovered", updatedAt: editor.recovered.updatedAt, onRestore: () => {
          // The restored snapshot is unrelated to any PR open in the editor: don't push it into that PR.
          editor.restoreRecovered();
          setRevision(null);
          toast.info("Draft restored");
        }, onDiscard: editor.discardRecovered }
    : revision
    ? { kind: "revising", number: revision.number, title: revision.title, feedback: revision.feedback }
    : changeRequest
    ? { kind: "changes-requested", number: changeRequest.number, title: changeRequest.title, feedback: changeRequest.latestFeedback, loading: loadingRevision, onRevise: () => requestRevision(changeRequest.number, changeRequest.latestFeedback) }
    : isUnassignedMember
    ? { kind: "no-role" }
    : null;

  const canvas = (
    <EditorCanvas
      user={user}
      roleInfo={roleInfo}
      selectedVertical={draft.selectedVertical}
      title={draft.title}
      onTitleChange={(v) => set("title", v)}
      content={draft.content}
      onContentChange={(v) => set("content", v)}
      coverImage={draft.coverImage}
      onCoverImageChange={(v) => set("coverImage", v)}
      wordCount={wordCount}
      readingTime={readingTime}
      uploadingImage={editor.uploadingImage}
      addImage={editor.addImage}
      onError={toast.error}
      onSync={sync}
      onOpenPublish={openPublish}
      textareaRef={textareaRef}
    />
  );
  const preview = (
    <ArticlePreview
      authorName={user.name || user.login}
      authorLogin={user.login}
      authorAvatar={user.avatar_url}
      selectedVertical={draft.selectedVertical}
      title={draft.title}
      coverImage={draft.coverImage}
      html={parsedHtml}
      wordCount={wordCount}
      readingTime={readingTime}
      summary={draft.summary}
      tags={draft.tags}
    />
  );

  return (
    <div>
      <EditorToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isUnassignedMember={isUnassignedMember}
        availableVerticals={selectableVerticals}
        selectedVertical={draft.selectedVertical}
        onVerticalChange={changeVertical}
        saveState={editor.saveState}
        syncing={syncing}
        onSync={sync}
        revisionPrNumber={revision?.number ?? null}
        onOpenPublish={openPublish}
        onNewPost={() =>
          editor.hasContent
            ? setPendingConfirm({
                title: "Start a new post?",
                message: "This clears the editor and the copy saved on this device. Anything you synced to GitHub stays there.",
                confirmLabel: "Start new post",
                run: startNewPost,
              })
            : startNewPost()
        }
        onOpenFromGitHub={openDrafts}
        onStopRevising={() => {
          setRevision(null);
          toast.info("Stopped revising — Submit will open a new pull request");
        }}
      />

      <StatusStrip state={strip} />

      {viewMode === "split" ? (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
          <div className="min-w-0">{canvas}</div>
          <div className="min-w-0 lg:sticky lg:top-[calc(var(--editor-toolbar-h,3.5rem)+0.5rem)] lg:max-h-[calc(100vh-var(--editor-toolbar-h,3.5rem)-1.5rem)] lg:self-start lg:overflow-y-auto">
            {preview}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{viewMode === "write" ? canvas : preview}</div>
      )}

      <PublishDrawer
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title={draft.title}
        content={draft.content}
        coverImage={draft.coverImage}
        availableVerticals={selectableVerticals}
        selectedVertical={draft.selectedVertical}
        onVerticalChange={changeVertical}
        summary={draft.summary}
        onSummaryChange={(v) => set("summary", v)}
        tags={draft.tags}
        onTagsChange={(v) => set("tags", v)}
        revision={revision ? { number: revision.number, feedback: revision.feedback } : null}
        submitting={submitting}
        serverError={submitError}
        onSubmit={submit}
      />

      <CloudDraftsDialog open={draftsOpen} login={user.login} drafts={remoteDrafts} loading={loadingDrafts} onLoad={openRemoteDraft} onClose={() => setDraftsOpen(false)} />
      <SubmissionSuccessDialog result={submissionResult} onClose={() => setSubmissionResult(null)} />
      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title ?? ""}
        message={pendingConfirm?.message ?? ""}
        confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
        onConfirm={() => {
          const action = pendingConfirm;
          setPendingConfirm(null);
          if (action) void action.run();
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
