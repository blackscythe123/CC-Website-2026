"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderArticlePreview } from "@/lib/renderPreview";
import { ALL_VERTICALS, CLUB_VERTICAL, getVertical } from "@/lib/verticals";
import { parseArticlePath, useArticleDraft } from "@/lib/hooks/useArticleDraft";
import { imagesTooLarge, readApiJson, TOO_LARGE_MESSAGE } from "@/lib/hooks/apiClient";
import { base64ToBlobUrl, type PendingDraftImage, type StoredRevision } from "@/lib/draftStorage";
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

const SAFE_UPLOAD_FILE = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/;

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

  // Keep the revision context in the local draft record so Restore after a reload keeps updating the same PR.
  const { setRevisionContext } = editor;
  useEffect(() => {
    setRevisionContext(
      revision
        ? { number: revision.number, branch: revision.branch, title: revision.title, filePath: revision.filePath, slug: revision.slug, vertical: revision.vertical }
        : null
    );
  }, [revision, setRevisionContext]);

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
      return renderArticlePreview(draft.content || "*Start writing to see the preview…*", {
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
        const { ok, data } = await readApiJson(res);
        if (!ok || !data.article) throw new Error(data.error || `Couldn't load PR #${prNumber}`);
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

  /**
   * After Restore: the restored draft was a revision of an open PR. Re-check with GitHub that the PR is
   * still open, is yours and still has that branch before Submit may update it; otherwise drop it.
   */
  const reattachRevision = useCallback(
    async (stored: StoredRevision) => {
      const drop = (why: string) => {
        setRevision(null);
        toast.info(`${why} Submit will open a new pull request instead.`);
      };
      try {
        const [listRes, previewRes] = await Promise.all([
          fetch("/api/posts/reviews"),
          fetch(`/api/posts/reviews?previewPullNumber=${stored.number}`),
        ]);
        const list = await readApiJson(listRes);
        const preview = await readApiJson(previewRes);
        const open = list.ok && Array.isArray(list.data.prs) ? list.data.prs.find((p: { number?: number }) => p.number === stored.number) : undefined;
        if (!list.ok) return drop(`Couldn't confirm PR #${stored.number} is still open.`);
        if (!open || String(open.author || "").toLowerCase() !== user.login.toLowerCase()) {
          return drop(`PR #${stored.number} is closed or no longer yours.`);
        }
        const article = preview.ok ? preview.data.article : null;
        if (!article || article.branch !== stored.branch) return drop(`PR #${stored.number} changed on GitHub.`);
        const target = parseArticlePath(typeof article.filePath === "string" ? article.filePath : null);
        const fromQueue = queue.mine.find((p) => p.number === stored.number);
        setRevision({
          number: stored.number,
          branch: article.branch,
          title: stored.title || article.title || "",
          feedback: fromQueue?.latestFeedback || "",
          filePath: typeof article.filePath === "string" ? article.filePath : null,
          slug: target?.slug ?? null,
          vertical: target?.vertical ?? null,
        });
        toast.info(`Still revising PR #${stored.number}`);
      } catch {
        drop(`Couldn't confirm PR #${stored.number} is still open.`);
      }
    },
    [queue.mine, toast, user.login]
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
    // Only images the article still references (same rule as submit), and stay under the request limit.
    const images = editor.activeImages();
    if (imagesTooLarge(images)) {
      toast.error(TOO_LARGE_MESSAGE);
      return;
    }
    setSyncing(true);
    try {
      await editor.saveNow();
      // Edits typed while the request is in flight are NOT on GitHub; only this snapshot is.
      const sentFingerprint = editor.fingerprint();
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
          pendingImages: images.map(({ filename, base64, placeholderUrl }) => ({ filename, base64, placeholderUrl })),
        }),
      });
      const { ok, data } = await readApiJson(res);
      if (!ok) throw new Error(data.error || "Couldn't sync to GitHub");
      editor.markSynced(sentFingerprint);
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
      const { ok, data } = await readApiJson(res);
      if (!ok) throw new Error(data.error || "Couldn't load your drafts");
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
      const { ok, data } = await readApiJson(res);
      if (!ok || !data.draft) throw new Error(data.error || "Couldn't open that draft");
      const d = data.draft;
      let content: string = d.markdownBody || "";
      let cover: string = d.coverImage || "";
      // Images that only exist on the draft branch: re-attach them as local images so Submit uploads them
      // onto the PR branch (otherwise the published article would point at files that aren't on main).
      const pendingImages: PendingDraftImage[] = [];
      const incoming: unknown = data.pendingImages ?? d.pendingImages;
      for (const raw of Array.isArray(incoming) ? incoming : []) {
        const img = raw as { filename?: unknown; base64?: unknown; mimeType?: unknown; uploadPath?: unknown };
        if (typeof img.filename !== "string" || typeof img.base64 !== "string" || typeof img.uploadPath !== "string") continue;
        if (!SAFE_UPLOAD_FILE.test(img.filename) || img.uploadPath !== `/uploads/${img.filename}`) continue;
        const mimeType = typeof img.mimeType === "string" && /^image\/(png|jpeg|webp|gif)$/.test(img.mimeType) ? img.mimeType : "image/png";
        const url = base64ToBlobUrl(img.base64, mimeType);
        if (!url.startsWith("blob:")) continue; // never let a data: URL reach the body
        content = content.split(img.uploadPath).join(url);
        if (cover === img.uploadPath) cover = url;
        pendingImages.push({ filename: img.filename, base64: img.base64, mimeType, placeholderUrl: url });
      }
      editor.loadFrom(
        { title: d.title || "", content, coverImage: cover, selectedVertical: d.vertical, summary: d.summary || "", tags: d.tags || [], pendingImages },
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
    const images = editor.activeImages();
    if (imagesTooLarge(images)) {
      setSubmitError(TOO_LARGE_MESSAGE);
      toast.error(TOO_LARGE_MESSAGE);
      return;
    }
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
          pendingImages: images,
          pullNumber: revision?.number,
          existingBranch: revision?.branch,
        }),
      });
      const { ok, data } = await readApiJson(res);
      if (!ok) throw new Error(data.error || "Couldn't submit the post");
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
          const storedRevision = editor.recovered?.revision ?? null;
          editor.restoreRecovered();
          setRevision(null);
          toast.info("Draft restored");
          // ...unless the snapshot itself was a revision of an open PR of yours: re-verify and re-attach it.
          if (storedRevision) void reattachRevision(storedRevision);
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
