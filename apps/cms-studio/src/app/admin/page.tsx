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
  Cloud,
  CloudUpload,
  FolderOpen,
  Mail,
  ShieldAlert,
  AlertTriangle,
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

  // Publishing Drawer State
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState("ai-ml");
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

  // Cross-Device Git Cloud Drafts State (Zero-DB Persistence)
  const [showRemoteDraftsModal, setShowRemoteDraftsModal] = useState(false);
  const [remoteDrafts, setRemoteDrafts] = useState<{
    branch: string;
    slug: string;
    vertical: string;
    title: string;
    updatedAt: string;
  }[]>([]);
  const [loadingRemoteDrafts, setLoadingRemoteDrafts] = useState(false);
  const [isSavingRemoteDraft, setIsSavingRemoteDraft] = useState(false);
  const [remoteDraftSuccessMessage, setRemoteDraftSuccessMessage] = useState<string | null>(null);

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
    branch?: string;
  } | null>(null);
  const [loadingFeedbackDraft, setLoadingFeedbackDraft] = useState(false);
  const [activeRevisionPr, setActiveRevisionPr] = useState<{
    number: number;
    branch: string;
    originalTitle: string;
  } | null>(null);

  // Repository Collaborator Access State (Internal Tool Enforcement)
  const [collaboratorStatus, setCollaboratorStatus] = useState<{
    isCollaborator: boolean;
    hasPendingInvite: boolean;
    inviteUrl: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter selectable verticals according to role (must be at top level before early returns)
  const isSuperadmin = roleInfo?.role === "superadmin";
  const userVerticals = roleInfo?.verticals || [];
  const availableVerticals = useMemo(() => {
    if (isSuperadmin) {
      return [{ slug: "club", name: "📢 Coding Club Announcements" }, ...ALL_VERTICALS];
    }
    return ALL_VERTICALS.filter((v) => userVerticals.includes(v.slug));
  }, [isSuperadmin, userVerticals]);

  const isUnassignedMember = !isSuperadmin && availableVerticals.length === 0;

  useEffect(() => {
    if (availableVerticals.length > 0 && !availableVerticals.some((v) => v.slug === selectedVertical)) {
      setSelectedVertical(availableVerticals[0].slug);
    }
  }, [availableVerticals, selectedVertical]);

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
          if (data.collaboratorStatus) {
            setCollaboratorStatus(data.collaboratorStatus);
          }
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
                    (p: { author: string; vertical: string; changesRequested?: boolean }) => {
                      if (p.changesRequested) return false; // Waiting on author to revise
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

          // Auto-load PR if requested via URL param (e.g. /admin?revise=6)
          const urlParams = new URLSearchParams(window.location.search);
          const revisePrNum = urlParams.get("revise");
          if (revisePrNum) {
            handleLoadFeedbackPR(parseInt(revisePrNum, 10));
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  // Internal Tool Security Gate: Strictly verify repository collaborator status
  if (collaboratorStatus && !collaboratorStatus.isCollaborator) {
    if (collaboratorStatus.hasPendingInvite) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-xs">
              <Mail className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                ⏳ Pending Invitation
              </span>
              <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Accept Repository Invite</h1>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                You are signed in as <strong>@{user.login}</strong>. You have an invitation to join <strong>blackscythe123/CC-Website-2026</strong>, but you haven&apos;t accepted it yet!
              </p>
            </div>
            <div className="space-y-3">
              <a
                href={collaboratorStatus.inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-amber-700 transition"
              >
                <span>Accept Invitation on GitHub ↗</span>
              </a>
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <span>I have accepted, check again</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-xs">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
              🔒 Internal Tool Only
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Repository Access Required</h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              SSN Coding Club Studio is strictly an internal tool for repository collaborators.
            </p>
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50/70 p-3.5 text-xs text-red-900 text-left">
              <p>
                You are signed in as <strong>@{user.login}</strong>, but you are not a collaborator on <strong>blackscythe123/CC-Website-2026</strong>.
              </p>
              <p className="mt-2 font-semibold text-red-800">
                👉 Please ask @blackscythe123 for repo collaborator access first.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <a
              href="/api/auth/logout"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-center"
            >
              Sign Out
            </a>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      {/* Editor Sub-Header Toolbar */}
      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <div className={`mx-auto flex ${viewMode === "split" ? "max-w-7xl" : "max-w-4xl"} items-center justify-between gap-4 transition-all duration-200`}>
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
                onChange={(e) => setSelectedVertical(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                {availableVerticals.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
            <span>•</span>
            <span className="text-amber-600 font-medium hidden sm:inline">Requires Approval</span>
            {pendingImages.length > 0 && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 font-semibold text-purple-700">
                  <ImageIcon className="h-3 w-3" />
                  {pendingImages.length} image{pendingImages.length > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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

            {/* Cloud Drafts / Cross-Device Sync Button */}
            <button
              type="button"
              onClick={handleFetchRemoteDrafts}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition"
              title="View and restore drafts saved to GitHub branches across devices"
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
                onClick={handleSaveRemoteDraft}
                disabled={isSavingRemoteDraft || isSavingDraft || isUnassignedMember}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-400 transition active:scale-95 disabled:opacity-50"
                title={
                  isUnassignedMember
                    ? "You must be assigned to a vertical in Governance & Roles before syncing cloud drafts"
                    : "Push WIP draft to your personal Git draft branch (drafts/username/slug) so you can resume on another device"
                }
              >
                <CloudUpload className="h-3.5 w-3.5 text-blue-600" />
                <span>{isSavingRemoteDraft ? "Syncing..." : "Save Draft"}</span>
              </button>
            </div>

            {isUnassignedMember ? (
              <a
                href="/admin/roles"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-300 px-3.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-500/25 transition"
                title="You must be assigned to a vertical in Governance & Roles before submitting articles"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Request Role to Publish</span>
              </a>
            ) : activeRevisionPr ? (
              <button
                onClick={() => setShowDrawer(true)}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
              >
                <span>Update PR #{activeRevisionPr.number}</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowDrawer(true)}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <span>Publish / Submit</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
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

      {/* Unassigned Member Notice Banner */}
      {isUnassignedMember && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-xs text-xs text-amber-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-amber-950 text-sm">
                  Role Assignment Required
                </span>
                <p className="text-amber-800 mt-0.5">
                  You are signed in as <strong>@{user?.login}</strong>, but have not been assigned to any of the 8 technical verticals yet. You can write and save drafts locally, but you must be assigned a role before submitting posts.
                </p>
              </div>
            </div>
            <a
              href="/admin/roles"
              className="rounded-xl bg-amber-600 px-3.5 py-2 font-bold text-white shadow-xs hover:bg-amber-700 transition shrink-0"
            >
              Request Role ↗
            </a>
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

            {/* Author Byline Card (Medium-Style in Write Canvas) */}
            {user && (
              <div className="flex items-center justify-between border-y border-gray-100 py-3 my-2 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar_url}
                    alt={user.name || user.login}
                    className="h-9 w-9 rounded-full ring-2 ring-gray-100 object-cover shadow-2xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{user.name || user.login}</span>
                      <span className="text-[11px] font-mono text-gray-400">@{user.login}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 capitalize">
                        {roleInfo?.role.replace("_", " ") || "Author"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      <span>Targeting:</span>
                      <span className="font-medium text-gray-700">
                        {selectedVertical === "club"
                          ? "📢 Coding Club Announcements"
                          : ALL_VERTICALS.find((v) => v.slug === selectedVertical)?.name || selectedVertical}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-gray-400 font-mono text-[11px]">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{readingTime} min read</span>
                </div>
              </div>
            )}

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
                {selectedVertical === "club"
                  ? "📢 Coding Club Announcements"
                  : ALL_VERTICALS.find((v) => v.slug === selectedVertical)?.name || selectedVertical}
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
                  Article Vertical
                </label>
                <select
                  value={selectedVertical}
                  onChange={(e) => setSelectedVertical(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 shadow-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {availableVerticals.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                  <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                    <span>🎯 Target Portal:</span>
                    <span className="font-mono text-blue-800">
                      {selectedVertical === "club"
                        ? "codingclub.tech (Main Portal)"
                        : `${selectedVertical}.codingclub.tech (${selectedVertical} Portal)`}
                    </span>
                  </div>
                  <p className="text-blue-700/80 mt-1 text-[11px]">
                    Autonomous 1-to-1 vertical routing. This article will live strictly inside its designated vertical portal and codebase.
                  </p>
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
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
                  activeRevisionPr
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {submitting
                  ? "Pushing Revisions..."
                  : activeRevisionPr
                  ? `Update PR #${activeRevisionPr.number} with Revisions 🚀`
                  : "Submit for Editorial Review 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Drafts Modal (Zero-DB Cross-Device Sync) */}
      {showRemoteDraftsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Your Cloud Git Drafts</h3>
              </div>
              <button
                onClick={() => setShowRemoteDraftsModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              These are unmerged WIP drafts pushed to personal branches (<code>drafts/{user?.login}/*</code>). You can open and continue them on any device without losing work.
            </p>

            {loadingRemoteDrafts ? (
              <div className="py-8 text-center text-xs text-gray-400 font-mono">
                Querying GitHub draft branches...
              </div>
            ) : remoteDrafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400">
                No cloud draft branches found for @{user?.login}. Click <strong>&quot;Save Draft&quot;</strong> in the toolbar to save your first cloud copy!
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {remoteDrafts.map((d) => (
                  <div
                    key={d.branch}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs hover:border-blue-400 transition"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">{d.title}</div>
                      <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                        {d.branch} • {new Date(d.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadRemoteDraft(d.branch)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-2xs hover:bg-blue-700 transition"
                    >
                      Load Draft
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRemoteDraftsModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Draft Save Success Toast */}
      {remoteDraftSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl text-xs font-semibold text-emerald-800 animate-slide-up">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{remoteDraftSuccessMessage}</span>
        </div>
      )}
    </div>
  );
}
