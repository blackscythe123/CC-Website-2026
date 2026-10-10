"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import StudioNav from "@/components/StudioNav";
import { UserRoleInfo } from "@/lib/roles";
import { marked } from "marked";
import {
  Image as ImageIcon,
  Code,
  Quote,
  Heading2,
  Heading3,
  Minus,
  List,
  Sparkles,
  Send,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Eye,
  Edit3,
  Columns,
  Save,
  Check,
  Bell,
  Clock,
} from "lucide-react";

import {
  saveLocalDraft,
  getLocalDraft,
  clearLocalDraft,
  base64ToBlobUrl,
  StoredDraft,
  PendingDraftImage,
} from "@/lib/draftStorage";

interface UserProfile {
  login: string;
  name: string;
  avatar_url: string;
}

const ALL_VERTICALS = [
  { slug: "ai-ml", name: "🤖 AI / ML" },
  { slug: "ar-vr-game-dev", name: "🎮 AR, VR & Game Dev" },
  { slug: "competitive-programming", name: "🏆 Competitive Programming" },
  { slug: "cybersecurity", name: "🛡️ Cyber Security" },
  { slug: "ssnhacks", name: "⚡ SSN Hacks" },
  { slug: "design-ui-ux", name: "🎨 Design & UI/UX" },
  { slug: "full-stack", name: "🌐 Full Stack" },
  { slug: "open-source", name: "💻 Open Source (OSS)" },
];

const ALL_PORTALS = [
  { id: "main-portal", name: "🌐 Main Coding Club Portal", domain: "codingclub.tech", vertical: "all" },
  { id: "ai-ml-portal", name: "🤖 AI / ML Portal", domain: "ai.codingclub.tech", vertical: "ai-ml" },
  { id: "ar-vr-portal", name: "🎮 AR, VR & Game Dev Portal", domain: "arvr.codingclub.tech", vertical: "ar-vr-game-dev" },
  { id: "cp-portal", name: "🏆 Competitive Programming Portal", domain: "cp.codingclub.tech", vertical: "competitive-programming" },
  { id: "cybersecurity-portal", name: "🛡️ Cyber Security Portal", domain: "cybersecurity.codingclub.tech", vertical: "cybersecurity" },
  { id: "ssnhacks-portal", name: "⚡ SSN Hacks Portal", domain: "hacks.codingclub.tech", vertical: "ssnhacks" },
  { id: "design-portal", name: "🎨 Design & UI/UX Portal", domain: "design.codingclub.tech", vertical: "design-ui-ux" },
  { id: "full-stack-portal", name: "🌐 Full Stack Portal", domain: "web.codingclub.tech", vertical: "full-stack" },
  { id: "oss-portal", name: "💻 Open Source (OSS) Portal", domain: "oss.codingclub.tech", vertical: "open-source" },
];

export default function AdminEditorPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor Content State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<"write" | "split" | "preview">("write");
  const [pendingImages, setPendingImages] = useState<PendingDraftImage[]>([]);

  // Real-time Markdown Parsing & Stats for Preview
  const parsedHtml = useMemo(() => {
    try {
      return marked.parse(content || "*Start writing to preview your article...*", {
        gfm: true,
        breaks: true,
      }) as string;
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

  // Publishing Drawer State & Multi-Portal Targets
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState("ai-ml");
  const [selectedPortals, setSelectedPortals] = useState<string[]>(["main-portal"]);
  const [summary, setSummary] = useState("");
  const [tagInput, setTagInput] = useState("");
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

  // In-App Editorial Notifications & Review Requests
  const [authorPendingPrs, setAuthorPendingPrs] = useState<{
    number: number;
    title: string;
    vertical: string;
    createdAt: string;
  }[]>([]);
  const [reviewerPendingCount, setReviewerPendingCount] = useState(0);
  const [authorFeedbackPr, setAuthorFeedbackPr] = useState<{
    number: number;
    title: string;
    feedback: string;
    vertical: string;
  } | null>(null);
  const [loadingFeedbackDraft, setLoadingFeedbackDraft] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 1. Check for recoverable IndexedDB local draft
    getLocalDraft().then((draft) => {
      if (
        draft &&
        (draft.title.trim() || draft.content.trim() || (draft.pendingImages && draft.pendingImages.length > 0))
      ) {
        setRecoveredDraft(draft);
      }
    });

    // 2. Fetch authenticated user profile & check for review requests / feedback
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setRoleInfo(data.roleInfo);
          // Auto-select allowed vertical
          if (data.roleInfo?.verticals?.length > 0) {
            setSelectedVertical(data.roleInfo.verticals[0]);
          }

          // Fetch all review PRs to track authored posts and reviewer queues
          fetch("/api/posts/reviews")
            .then((r) => r.json())
            .then((rData) => {
              if (rData.prs && data.user) {
                // 1. Author's PRs with feedback requested
                const myPrWithFeedback = rData.prs.find(
                  (p: { author: string; changesRequested?: boolean; latestFeedback?: string }) =>
                    p.author.toLowerCase() === data.user.login.toLowerCase() &&
                    p.changesRequested &&
                    p.latestFeedback
                );
                if (myPrWithFeedback) {
                  setAuthorFeedbackPr({
                    number: myPrWithFeedback.number,
                    title: myPrWithFeedback.title,
                    feedback: myPrWithFeedback.latestFeedback,
                    vertical: myPrWithFeedback.vertical,
                  });
                }

                // 2. Author's PRs currently under review
                const myPending = rData.prs
                  .filter(
                    (p: { author: string; changesRequested?: boolean }) =>
                      p.author.toLowerCase() === data.user.login.toLowerCase() &&
                      !p.changesRequested
                  )
                  .map((p: { number: number; title: string; vertical: string; createdAt: string }) => ({
                    number: p.number,
                    title: p.title,
                    vertical: p.vertical,
                    createdAt: p.createdAt,
                  }));
                setAuthorPendingPrs(myPending);

                // 3. For reviewers: PRs waiting for their review
                if (
                  data.roleInfo?.role === "superadmin" ||
                  data.roleInfo?.role === "vertical_head" ||
                  data.roleInfo?.role === "deputy"
                ) {
                  const forReviewer = rData.prs.filter(
                    (p: { author: string; vertical: string }) => {
                      const isSelf = p.author.toLowerCase() === data.user.login.toLowerCase();
                      if (isSelf) return false;
                      if (data.roleInfo.role === "superadmin") return true;
                      return data.roleInfo.verticals.includes(p.vertical);
                    }
                  );
                  setReviewerPendingCount(forReviewer.length);
                }
              }
            })
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Manual Save Draft Handler
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
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.warn("Failed manual draft save:", err);
    } finally {
      setIsSavingDraft(false);
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
      "image/svg+xml",
    ];
    if (!allowedMimes.includes(file.type)) {
      setErrorMessage("Only JPEG, PNG, WebP, GIF, and SVG images are supported.");
      return null;
    }
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setErrorMessage("Image exceeds 5MB size limit.");
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

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,/, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const togglePortalSelection = (portalId: string) => {
    if (selectedPortals.includes(portalId)) {
      if (selectedPortals.length > 1) {
        setSelectedPortals(selectedPortals.filter((p) => p !== portalId));
      }
    } else {
      setSelectedPortals([...selectedPortals, portalId]);
    }
  };

  const handleSubmitDraft = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter an article title.");
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
          targetPortals: selectedPortals,
          title: title.trim(),
          summary: summary.trim(),
          coverImage,
          tags,
          markdownBody: content,
          pendingImages: activeImages,
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
      await clearLocalDraft();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error submitting post");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium text-gray-500">Loading CMS Studio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-mono text-2xl font-bold text-white shadow-md">
            &lt;/&gt;
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">SSN Coding Club Studio</h1>
            <p className="mt-2 text-sm text-gray-500">
              Modern Medium-style writing canvas backed by GitHub.
            </p>
          </div>
          <a
            href="/api/auth"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black transition"
          >
            Sign in with GitHub
          </a>
        </div>
      </div>
    );
  }

  // Filter selectable verticals according to role
  const availableVerticals =
    roleInfo?.role === "superadmin"
      ? [{ slug: "club", name: "📢 Coding Club Announcements" }, ...ALL_VERTICALS]
      : roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy"
      ? ALL_VERTICALS.filter((v) => roleInfo.verticals.includes(v.slug))
      : ALL_VERTICALS;

  // Filter selectable destination portals according to role
  const allowedPortals = useMemo(() => {
    if (!roleInfo) return ALL_PORTALS.filter((p) => p.id === "main-portal");
    if (roleInfo.role === "superadmin") return ALL_PORTALS;
    return ALL_PORTALS.filter(
      (p) => p.id === "main-portal" || (p.vertical && roleInfo.verticals.includes(p.vertical))
    );
  }, [roleInfo]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      {/* Editor Sub-Header Toolbar */}
      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <div className={`mx-auto flex ${viewMode === "split" ? "max-w-7xl" : "max-w-4xl"} items-center justify-between gap-4 transition-all duration-200`}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-700">Writing in:</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">
              {ALL_VERTICALS.find((v) => v.slug === selectedVertical)?.name || selectedVertical}
            </span>
            <span>•</span>
            <span className="text-amber-600 font-medium">Draft (Requires Editorial Approval)</span>
            {pendingImages.length > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 font-semibold text-purple-700">
                  <ImageIcon className="h-3 w-3" />
                  {pendingImages.length} image{pendingImages.length > 1 ? "s" : ""} cached (deferred upload)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Segmented Pill */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50/90 p-0.5 text-xs font-medium shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("write")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                  viewMode === "write"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="Canvas Editor only"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Write</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                  viewMode === "split"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="Split screen: write & see real-time preview side-by-side"
              >
                <Columns className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                  viewMode === "preview"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="Full live reading preview"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            {/* Save Draft Button with Local State Indicator */}
            <div className="flex items-center gap-2">
              {lastSavedAt && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Saved at {lastSavedAt}</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-400 transition active:scale-95 disabled:opacity-50"
                title="Save draft immediately to local browser storage"
              >
                <Save className="h-3.5 w-3.5 text-gray-600" />
                <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
              </button>
            </div>

            <button
              onClick={() => setShowDrawer(true)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <span>Publish / Submit</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Modal */}
      {submissionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Submitted for Editorial Review!</h3>
              <p className="mt-2 text-sm text-gray-500">
                Your post has been committed to a draft branch and opened as Pull Request{" "}
                <span className="font-bold text-gray-800">#{submissionResult.pullNumber}</span> on
                GitHub.
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 text-left space-y-1">
              <div>
                <strong>Governance Rule:</strong> A designated Vertical Head or Superadmin will
                review and merge this PR on the Editorial Reviews page before it goes live.
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={submissionResult.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span>View PR #{submissionResult.pullNumber} on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="/admin/reviews"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Go to Editorial Reviews Dashboard &rarr;
              </a>
              <button
                onClick={() => setSubmissionResult(null)}
                className="text-xs text-gray-400 hover:text-gray-600 pt-1"
              >
                Close & Continue Writing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Local Draft Recovered Notification Banner */}
      {recoveredDraft && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm text-xs text-amber-900">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-950">⚡ Unsaved Local Draft Recovered!</span>
                <p className="text-amber-800 mt-0.5">
                  An unsaved draft from {new Date(recoveredDraft.updatedAt).toLocaleTimeString()} was saved in browser storage.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="rounded-xl bg-amber-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-amber-700 transition"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 transition"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Author Review Requested Notification Banner */}
      {authorPendingPrs.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm text-xs text-blue-900">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shrink-0">
                📬
              </div>
              <div>
                <span className="font-bold text-blue-950">
                  Review Requested: You have {authorPendingPrs.length} article{authorPendingPrs.length > 1 ? "s" : ""} under Editorial Review
                </span>
                <div className="text-blue-800 mt-1 space-y-0.5">
                  {authorPendingPrs.map((pr) => (
                    <div key={pr.number} className="flex items-center gap-2">
                      <span>•</span>
                      <span>
                        <strong>PR #{pr.number}</strong> &ldquo;{pr.title}&rdquo; in
                      </span>
                      <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                        {pr.vertical}
                      </span>
                      <span className="text-blue-600 text-[11px]">(Awaiting Reviewer Approval)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/admin/reviews"
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                Track in Reviews &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer Action Notice Banner */}
      {reviewerPendingCount > 0 && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm text-xs text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shrink-0">
                ⚡
              </div>
              <div>
                <span className="font-bold text-emerald-950">
                  Editorial Action Required: {reviewerPendingCount} article{reviewerPendingCount > 1 ? "s" : ""} awaiting your sign-off
                </span>
                <p className="text-emerald-800 mt-0.5">
                  Articles have been submitted for your vertical. Review, test, and approve or request revisions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/admin/reviews"
                className="rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                Review Articles ({reviewerPendingCount}) &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Changes Requested Notification Banner */}
      {authorFeedbackPr && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm text-xs text-red-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-950">
                  ⚠️ Editorial Feedback on PR #{authorFeedbackPr.number}: &ldquo;{authorFeedbackPr.title}&rdquo;
                </div>
                <p className="text-red-800 mt-1 whitespace-pre-wrap font-sans">
                  <strong>Revision Required:</strong> {authorFeedbackPr.feedback}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleLoadFeedbackPR(authorFeedbackPr.number)}
                disabled={loadingFeedbackDraft}
                className="rounded-xl bg-red-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {loadingFeedbackDraft ? "Loading..." : "Load Draft & Revise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Editor Canvas Form */}
      {(() => {
        const editorFormNode = (
          <div className="space-y-6">
            {/* Cover Image Selector */}
            <div>
              {coverImage ? (
                <div className="relative group overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="h-64 w-full object-cover sm:h-80 transition"
                  />
                  <button
                    onClick={() => setCoverImage("")}
                    className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black transition"
                    title="Remove cover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-400 transition">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <UploadCloud className="h-5 w-5 text-gray-400" />
                    <span>Add a cover banner image (drag &amp; drop or click to upload)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await handleImageUpload(e.target.files[0]);
                        if (url) setCoverImage(url);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Title (Big Medium-style Headline) */}
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              rows={1}
              className="w-full resize-none border-none text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 placeholder-gray-300 focus:outline-hidden focus:ring-0 leading-tight"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />

            {/* Floating Formatting Toolbar */}
            <div className="sticky top-28 z-30 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md">
              <button
                onClick={() => insertAtCursor("\n\n## Section Heading\n\n")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                title="Heading 2"
              >
                <Heading2 className="h-3.5 w-3.5" />
                <span>H2</span>
              </button>
              <button
                onClick={() => insertAtCursor("\n\n### Subheading\n\n")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                title="Heading 3"
              >
                <Heading3 className="h-3.5 w-3.5" />
                <span>H3</span>
              </button>
              <button
                onClick={() => insertAtCursor("\n\n> Medium-style memorable pull-quote...\n\n")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                title="Quote"
              >
                <Quote className="h-3.5 w-3.5" />
                <span>Quote</span>
              </button>
              <button
                onClick={() => insertAtCursor("\n\n```typescript\n// Your code snippet here\n```\n\n")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                title="Code Block"
              >
                <Code className="h-3.5 w-3.5" />
                <span>Code</span>
              </button>
              <button
                onClick={() => insertAtCursor("\n\n- Item 1\n- Item 2\n- Item 3\n\n")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                title="Bulleted List"
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => insertAtCursor("\n\n---\n\n")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                title="Divider"
              >
                <Minus className="h-3.5 w-3.5" />
                <span>Divider</span>
              </button>

              <label className="flex items-center gap-1 cursor-pointer rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition ml-auto">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{uploadingImage ? "Processing..." : "Insert Mid-Post Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const url = await handleImageUpload(e.target.files[0]);
                      if (url) {
                        insertAtCursor(`\n\n![${e.target.files[0].name}](${url})\n\n`);
                      }
                    }
                  }}
                />
              </label>
            </div>

            {/* Medium-style Body Canvas Area */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onDrop={handleDrop}
              placeholder="Tell your story... Drag and drop images anywhere mid-article, or click 'Insert Mid-Post Image'..."
              className="min-h-[500px] w-full resize-none border-none text-lg leading-relaxed text-gray-800 placeholder-gray-300 focus:outline-hidden focus:ring-0"
            />
          </div>
        );

        const previewNode = (
          <article className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-10 shadow-sm transition">
            {/* Cover Image Banner */}
            {coverImage ? (
              <div className="mb-8 overflow-hidden rounded-2xl shadow-sm border border-gray-100">
                <img
                  src={coverImage}
                  alt={title || "Cover Image"}
                  className="h-64 sm:h-96 w-full object-cover"
                />
              </div>
            ) : null}

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">
                {ALL_VERTICALS.find((v) => v.slug === selectedVertical)?.name || selectedVertical}
              </span>
              <span>•</span>
              <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              <span>•</span>
              <span className="font-medium text-gray-600">{readingTime} min read</span>
              <span>•</span>
              <span>{wordCount} words</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
              {title.trim() ? title : <span className="text-gray-300 italic">Untitled Article</span>}
            </h1>

            {/* Author Card */}
            {user && (
              <div className="flex items-center gap-3.5 border-y border-gray-100 py-4 my-6">
                <img
                  src={user.avatar_url}
                  alt={user.name || user.login}
                  className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{user.name || user.login}</div>
                  <div className="text-xs text-gray-500">
                    @{user.login}
                  </div>
                </div>
              </div>
            )}

            {/* Rendered Markdown Body */}
            <div
              className="article-preview text-gray-800"
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />
          </article>
        );

        if (viewMode === "write") {
          return (
            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
              {editorFormNode}
            </main>
          );
        }

        if (viewMode === "preview") {
          return (
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
              {previewNode}
            </main>
          );
        }

        return (
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
                {editorFormNode}
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
                  {previewNode}
                </div>
              </div>
            </div>
          </main>
        );
      })()}

      {/* Publish Slide-Over Drawer (Medium Style) */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition">
          <div className="flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl sm:p-8">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900">Publishing Submission</h2>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
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
                  Select Vertical
                </label>
                <select
                  value={selectedVertical}
                  onChange={(e) => {
                    const newVertical = e.target.value;
                    setSelectedVertical(newVertical);
                    // Automatically add corresponding vertical portal if allowed and available
                    const matching = allowedPortals.find((p) => p.vertical === newVertical);
                    if (matching && !selectedPortals.includes(matching.id)) {
                      setSelectedPortals([...selectedPortals, matching.id]);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 shadow-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {availableVerticals.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Subdomain Portals / Multi-Website Destinations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Publish To Portal(s)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPortals.length === allowedPortals.length) {
                        setSelectedPortals(["main-portal"]);
                      } else {
                        setSelectedPortals(allowedPortals.map((p) => p.id));
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {selectedPortals.length === allowedPortals.length ? "Reset to Main" : "Select All"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mb-2.5">
                  Route to central main portal or specific vertical subdomain project websites (restricted by your role).
                </p>
                <div className="space-y-1.5">
                  {allowedPortals.map((portal) => {
                    const isChecked = selectedPortals.includes(portal.id);
                    return (
                      <label
                        key={portal.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs cursor-pointer transition ${
                          isChecked
                            ? "border-blue-300 bg-blue-50/60 text-blue-900 font-semibold shadow-xs"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePortalSelection(portal.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>{portal.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-400">{portal.domain}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Summary / Subtitle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Article Summary / Excerpt
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
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
                onClick={handleSubmitDraft}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? "Opening Pull Request..." : "Submit for Editorial Review 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
