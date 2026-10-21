"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Edit3, Eye } from "lucide-react";
import { marked } from "marked";
import StudioNav from "@/components/StudioNav";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { ALL_VERTICALS, CLUB_VERTICAL } from "@/lib/verticals";
import { useStudioSession } from "@/lib/hooks/useStudioSession";
import { useEditorNotifications } from "@/lib/hooks/useEditorNotifications";
import {
  AccessRequestScreen,
  PendingInviteScreen,
  SignInScreen,
  StudioLoadingScreen,
} from "@/components/editor/AccessScreens";
import EditorToolbar, { type ViewMode } from "@/components/editor/EditorToolbar";
import {
  AuthorPendingBanner,
  ChangesRequestedBanner,
  RecoveredDraftBanner,
  ReviewerActionBanner,
  UnassignedMemberBanner,
} from "@/components/editor/EditorBanners";
import EditorCanvas from "@/components/editor/EditorCanvas";
import ArticlePreview from "@/components/editor/ArticlePreview";
import PublishDrawer from "@/components/editor/PublishDrawer";
import {
  CloudDraftsModal,
  SubmissionSuccessModal,
  SuccessToast,
  type RemoteDraftSummary,
} from "@/components/editor/EditorDialogs";

import {
  saveLocalDraft,
  getLocalDraft,
  clearLocalDraft,
  base64ToBlobUrl,
  StoredDraft,
  PendingDraftImage,
} from "@/lib/draftStorage";

export default function AdminEditorPage() {
  const { user, roleInfo, collaboratorStatus, loading } = useStudioSession();
  const { authorPendingPrs, reviewerPendingCount, authorFeedbackPr, setAuthorFeedbackPr } =
    useEditorNotifications(user, roleInfo);

  // Editor Content State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("write");
  const [pendingImages, setPendingImages] = useState<PendingDraftImage[]>([]);

  // Real-time Markdown Parsing & Stats for Preview
  const parsedHtml = useMemo(() => {
    try {
      const rawHtml = marked.parse(content || "*Start writing to preview your article...*", {
        gfm: true,
        breaks: true,
      }) as string;
      return sanitizeArticleHtml(rawHtml);
    } catch {
      return "<p class='text-red-500'>Error parsing markdown</p>";
    }
  }, [content]);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Publishing Drawer State
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState("ai-ml");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    pullNumber: number;
    prUrl: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Local Draft Recovery State (IndexedDB)
  const [recoveredDraft, setRecoveredDraft] = useState<StoredDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Cross-Device Git Cloud Drafts State (Zero-DB Persistence)
  const [showRemoteDraftsModal, setShowRemoteDraftsModal] = useState(false);
  const [remoteDrafts, setRemoteDrafts] = useState<RemoteDraftSummary[]>([]);
  const [loadingRemoteDrafts, setLoadingRemoteDrafts] = useState(false);
  const [isSavingRemoteDraft, setIsSavingRemoteDraft] = useState(false);
  const [remoteDraftSuccessMessage, setRemoteDraftSuccessMessage] = useState<string | null>(null);

  // Revising a PR after editorial feedback
  const [loadingFeedbackDraft, setLoadingFeedbackDraft] = useState(false);
  const [activeRevisionPr, setActiveRevisionPr] = useState<{
    number: number;
    branch: string;
    originalTitle: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter selectable verticals according to role (must be at top level before early returns)
  const isSuperadmin = roleInfo?.role === "superadmin";
  const userVerticals = roleInfo?.verticals || [];
  const availableVerticals = useMemo(() => {
    if (isSuperadmin) {
      return [CLUB_VERTICAL, ...ALL_VERTICALS];
    }
    return ALL_VERTICALS.filter((v) => userVerticals.includes(v.slug));
  }, [isSuperadmin, userVerticals]);

  const isUnassignedMember = !isSuperadmin && availableVerticals.length === 0;

  useEffect(() => {
    if (availableVerticals.length > 0 && !availableVerticals.some((v) => v.slug === selectedVertical)) {
      setSelectedVertical(availableVerticals[0].slug);
    }
  }, [availableVerticals, selectedVertical]);

  // Check for recoverable IndexedDB local draft
  useEffect(() => {
    getLocalDraft().then((draft) => {
      if (
        draft &&
        (draft.title.trim() || draft.content.trim() || (draft.pendingImages && draft.pendingImages.length > 0))
      ) {
        setRecoveredDraft(draft);
      }
    });
  }, []);

  // Once signed in: pick the first allowed vertical and honour /admin?revise=<PR number>
  const sessionInitDone = useRef(false);
  useEffect(() => {
    if (!user || sessionInitDone.current) return;
    sessionInitDone.current = true;

    if (roleInfo?.verticals?.length) {
      setSelectedVertical(roleInfo.verticals[0]);
    }

    const revisePrNum = new URLSearchParams(window.location.search).get("revise");
    if (revisePrNum) {
      handleLoadFeedbackPR(parseInt(revisePrNum, 10));
    }
  }, [user, roleInfo]);

  // Manual Save Draft Handler (Local Browser Storage)
  const handleManualSaveDraft = async () => {
    if (!title.trim() && !content.trim() && pendingImages.length === 0) {
      setErrorMessage("Nothing to save yet! Start writing your article first.");
      return;
    }
    setIsSavingDraft(true);
    try {
      const coverImgObj = pendingImages.find((img) => img.placeholderUrl === coverImage);
      await saveLocalDraft({
        title,
        content,
        coverImage,
        coverImageBase64: coverImgObj?.base64,
        coverImageMime: coverImgObj?.mimeType,
        selectedVertical,
        summary,
        tags,
        pendingImages,
      });
      setLastSavedAt(`Local (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`);
    } catch (err) {
      console.warn("Failed manual draft save:", err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Cross-Device Save to GitHub Personal Draft Branch (Zero-DB Persistence)
  const handleSaveRemoteDraft = async () => {
    if (!title.trim() && !content.trim()) {
      setErrorMessage("Please write a title or body before saving to cloud branch.");
      return;
    }
    setIsSavingRemoteDraft(true);
    setErrorMessage("");
    try {
      await handleManualSaveDraft();

      const res = await fetch("/api/posts/drafts/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          markdownBody: content,
          vertical: selectedVertical,
          summary,
          tags,
          coverImage,
          pendingImages: pendingImages.map((img) => ({
            filename: img.filename,
            base64: img.base64,
            placeholderUrl: img.placeholderUrl,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save to cloud draft branch");
      }

      setLastSavedAt(`Cloud Branch (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`);
      setRemoteDraftSuccessMessage(`Saved to Git branch: ${data.branch}`);
      setTimeout(() => setRemoteDraftSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Cloud save failed:", err);
      setErrorMessage(err.message || "Failed to save draft to cloud branch");
    } finally {
      setIsSavingRemoteDraft(false);
    }
  };

  // Fetch list of remote personal draft branches from GitHub
  const handleFetchRemoteDrafts = async () => {
    setShowRemoteDraftsModal(true);
    setLoadingRemoteDrafts(true);
    try {
      const res = await fetch("/api/posts/drafts/remote");
      const data = await res.json();
      if (data.drafts && Array.isArray(data.drafts)) {
        setRemoteDrafts(data.drafts);
      }
    } catch (err) {
      console.error("Failed to load remote drafts:", err);
    } finally {
      setLoadingRemoteDrafts(false);
    }
  };

  // Load a remote draft branch into editor
  const handleLoadRemoteDraft = async (branchName: string) => {
    setLoadingRemoteDrafts(true);
    try {
      const res = await fetch(`/api/posts/drafts/remote?branch=${encodeURIComponent(branchName)}`);
      const data = await res.json();
      if (data.draft) {
        setTitle(data.draft.title || "");
        setContent(data.draft.markdownBody || "");
        setCoverImage(data.draft.coverImage || "");
        if (data.draft.vertical) setSelectedVertical(data.draft.vertical);
        setSummary(data.draft.summary || "");
        setTags(data.draft.tags || []);
        setShowRemoteDraftsModal(false);
        setLastSavedAt(`Restored from ${branchName}`);
      }
    } catch (err) {
      console.error("Error loading remote draft branch:", err);
      setErrorMessage("Failed to restore remote draft from branch.");
    } finally {
      setLoadingRemoteDrafts(false);
    }
  };

  // Debounced Auto-Save to IndexedDB (survives crashes, power outages, and tab closures)
  useEffect(() => {
    if (!title.trim() && !content.trim() && pendingImages.length === 0) return;
    const timer = setTimeout(async () => {
      const coverImgObj = pendingImages.find((img) => img.placeholderUrl === coverImage);
      await saveLocalDraft({
        title,
        content,
        coverImage,
        coverImageBase64: coverImgObj?.base64,
        coverImageMime: coverImgObj?.mimeType,
        selectedVertical,
        summary,
        tags,
        pendingImages,
      });
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, content, coverImage, selectedVertical, summary, tags, pendingImages]);

  // Alert user before closing or reloading if there are unsaved edits or pending images
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (title.trim() || content.trim() || pendingImages.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [title, content, pendingImages]);

  const handleRestoreDraft = () => {
    if (!recoveredDraft) return;

    let restoredContent = recoveredDraft.content || "";
    let restoredCoverImage = recoveredDraft.coverImage || "";

    // Convert stored base64 images back into fresh valid browser Object URLs
    const refreshedPendingImages = (recoveredDraft.pendingImages || []).map((img) => {
      const freshBlobUrl = base64ToBlobUrl(img.base64, img.mimeType || "image/png");
      if (img.placeholderUrl) {
        restoredContent = restoredContent.replaceAll(img.placeholderUrl, freshBlobUrl);
        if (restoredCoverImage === img.placeholderUrl) {
          restoredCoverImage = freshBlobUrl;
        }
      }
      return {
        ...img,
        placeholderUrl: freshBlobUrl,
      };
    });

    // Restore cover image if it was saved as base64 or an expired blob URL
    if (restoredCoverImage.startsWith("blob:") && recoveredDraft.coverImageBase64) {
      restoredCoverImage = base64ToBlobUrl(
        recoveredDraft.coverImageBase64,
        recoveredDraft.coverImageMime || "image/png"
      );
    } else if (restoredCoverImage.startsWith("blob:") && refreshedPendingImages.length > 0) {
      const matched = refreshedPendingImages.find((img) => img.placeholderUrl === restoredCoverImage);
      if (matched) {
        restoredCoverImage = matched.placeholderUrl;
      }
    }

    setTitle(recoveredDraft.title || "");
    setContent(restoredContent);
    setCoverImage(restoredCoverImage);
    if (recoveredDraft.selectedVertical) setSelectedVertical(recoveredDraft.selectedVertical);
    setSummary(recoveredDraft.summary || "");
    setTags(recoveredDraft.tags || []);
    setPendingImages(refreshedPendingImages);
    setRecoveredDraft(null);
    setLastSavedAt(new Date(recoveredDraft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const handleDiscardDraft = async () => {
    await clearLocalDraft();
    setRecoveredDraft(null);
  };

  const handleLoadFeedbackPR = async (prNumber: number) => {
    setLoadingFeedbackDraft(true);
    try {
      const res = await fetch(`/api/posts/reviews?previewPullNumber=${prNumber}`);
      const data = await res.json();
      if (data.article) {
        setTitle(data.article.title || "");
        setContent(data.article.markdownBody || "");
        setCoverImage(data.article.coverImage || "");
        if (data.article.vertical) setSelectedVertical(data.article.vertical);
        setSummary(data.article.summary || "");
        setTags(data.article.tags || []);
        setActiveRevisionPr({
          number: prNumber,
          branch: data.article.branch,
          originalTitle: data.article.title || "",
        });
        setAuthorFeedbackPr(null);
      }
    } catch (err) {
      console.error("Error loading feedback draft:", err);
    } finally {
      setLoadingFeedbackDraft(false);
    }
  };

  // Local In-Browser Image Handler (Deferred Upload until Final Submission)
  const handleImageUpload = async (file: File): Promise<string | null> => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedMimes.includes(file.type)) {
      setErrorMessage("Only JPEG, PNG, WebP, and GIF images are supported. SVGs and RAW camera formats are strictly forbidden.");
      return null;
    }
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setErrorMessage(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed image size is 5MB.`);
      return null;
    }

    setUploadingImage(true);
    setErrorMessage("");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64Content = res.split(",")[1];
          resolve(base64Content);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const placeholderUrl = URL.createObjectURL(file);
      setPendingImages((prev) => [
        ...prev,
        {
          filename: file.name,
          base64,
          mimeType: file.type || "image/png",
          placeholderUrl,
        },
      ]);
      return placeholderUrl;
    } catch (err) {
      console.error("Local image caching error:", err);
      setErrorMessage("Failed to process image in browser.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Drag & Drop handler on editor
  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const url = await handleImageUpload(file);
        if (url) {
          insertAtCursor(`\n\n![${file.name.replace(/\.[^/.]+$/, "")}](${url})\n\n`);
        }
      }
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const updated = text.substring(0, start) + textToInsert + text.substring(end);
    setContent(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  };

  const handleSubmitDraft = async () => {
    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage("Please enter an article title of at least 3 characters.");
      return;
    }
    if (!content.trim()) {
      setErrorMessage("Please enter article content.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    // Only upload images that are still active in content or cover
    const activeImages = pendingImages.filter(
      (img) => content.includes(img.placeholderUrl) || coverImage === img.placeholderUrl
    );

    try {
      const res = await fetch("/api/posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: selectedVertical,
          title: title.trim(),
          summary: summary.trim(),
          coverImage,
          tags,
          markdownBody: content,
          pendingImages: activeImages,
          pullNumber: activeRevisionPr?.number,
          existingBranch: activeRevisionPr?.branch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit post");
      }

      setSubmissionResult({
        pullNumber: data.pullNumber,
        prUrl: data.prUrl,
      });
      setShowDrawer(false);
      setPendingImages([]);
      setActiveRevisionPr(null);
      await clearLocalDraft();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error submitting post");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <StudioLoadingScreen />;
  if (!user) return <SignInScreen />;

  // Internal Tool Security Gate: Strictly verify repository collaborator status
  if (collaboratorStatus && !collaboratorStatus.isCollaborator) {
    if (collaboratorStatus.hasPendingInvite) {
      return <PendingInviteScreen user={user} inviteUrl={collaboratorStatus.inviteUrl} />;
    }
    return <AccessRequestScreen user={user} />;
  }

  const editorCanvas = (
    <EditorCanvas
      user={user}
      roleInfo={roleInfo}
      selectedVertical={selectedVertical}
      title={title}
      onTitleChange={setTitle}
      content={content}
      onContentChange={setContent}
      coverImage={coverImage}
      onCoverImageChange={setCoverImage}
      wordCount={wordCount}
      readingTime={readingTime}
      uploadingImage={uploadingImage}
      onImageUpload={handleImageUpload}
      onInsert={insertAtCursor}
      onDrop={handleDrop}
      textareaRef={textareaRef}
    />
  );

  const articlePreview = (
    <ArticlePreview
      user={user}
      selectedVertical={selectedVertical}
      title={title}
      coverImage={coverImage}
      html={parsedHtml}
      wordCount={wordCount}
      readingTime={readingTime}
    />
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      <EditorToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isUnassignedMember={isUnassignedMember}
        availableVerticals={availableVerticals}
        selectedVertical={selectedVertical}
        onVerticalChange={setSelectedVertical}
        pendingImageCount={pendingImages.length}
        lastSavedAt={lastSavedAt}
        isSavingDraft={isSavingDraft}
        isSavingRemoteDraft={isSavingRemoteDraft}
        onOpenCloudDrafts={handleFetchRemoteDrafts}
        onSaveRemoteDraft={handleSaveRemoteDraft}
        revisionPrNumber={activeRevisionPr?.number ?? null}
        onOpenPublish={() => setShowDrawer(true)}
      />

      {submissionResult && (
        <SubmissionSuccessModal
          pullNumber={submissionResult.pullNumber}
          prUrl={submissionResult.prUrl}
          onClose={() => setSubmissionResult(null)}
        />
      )}

      {recoveredDraft && (
        <RecoveredDraftBanner
          updatedAt={recoveredDraft.updatedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      {authorPendingPrs.length > 0 && <AuthorPendingBanner prs={authorPendingPrs} />}
      {reviewerPendingCount > 0 && <ReviewerActionBanner count={reviewerPendingCount} />}
      {isUnassignedMember && <UnassignedMemberBanner login={user.login} />}
      {authorFeedbackPr && (
        <ChangesRequestedBanner
          pr={authorFeedbackPr}
          loading={loadingFeedbackDraft}
          onRevise={() => handleLoadFeedbackPR(authorFeedbackPr.number)}
        />
      )}

      {viewMode === "write" && (
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          {editorCanvas}
        </main>
      )}

      {viewMode === "preview" && (
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-center justify-between rounded-xl bg-blue-50/80 border border-blue-100 px-4 py-2.5 text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Live Article Preview</span>
              <span className="hidden sm:inline text-blue-500">— Exactly as readers will see it once published</span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("write")}
              className="font-medium text-blue-700 hover:text-blue-900 underline"
            >
              Return to Edit &rarr;
            </button>
          </div>
          {articlePreview}
        </main>
      )}

      {viewMode === "split" && (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Markdown Canvas */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  Markdown Canvas
                </span>
                <span>{wordCount} words</span>
              </div>
              {editorCanvas}
            </div>

            {/* Right Column: Live Rendered Preview */}
            <div className="lg:sticky lg:top-28">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                  Real-Time Live Preview
                </span>
                <span className="text-emerald-600 font-medium">⚡ Instant Sync</span>
              </div>
              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
                {articlePreview}
              </div>
            </div>
          </div>
        </main>
      )}

      {showDrawer && (
        <PublishDrawer
          onClose={() => setShowDrawer(false)}
          errorMessage={errorMessage}
          availableVerticals={availableVerticals}
          selectedVertical={selectedVertical}
          onVerticalChange={setSelectedVertical}
          summary={summary}
          onSummaryChange={setSummary}
          tags={tags}
          onTagsChange={setTags}
          revisionPrNumber={activeRevisionPr?.number ?? null}
          submitting={submitting}
          onSubmit={handleSubmitDraft}
        />
      )}

      {showRemoteDraftsModal && (
        <CloudDraftsModal
          login={user.login}
          drafts={remoteDrafts}
          loading={loadingRemoteDrafts}
          onLoad={handleLoadRemoteDraft}
          onClose={() => setShowRemoteDraftsModal(false)}
        />
      )}

      {remoteDraftSuccessMessage && <SuccessToast message={remoteDraftSuccessMessage} />}
    </div>
  );
}
