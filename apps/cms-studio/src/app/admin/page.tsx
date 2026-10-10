"use client";

import { useState, useEffect, useRef } from "react";
import StudioNav from "@/components/StudioNav";
import { UserRoleInfo } from "@/lib/roles";
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
} from "lucide-react";

interface UserProfile {
  login: string;
  name: string;
  avatar_url: string;
}

const ALL_VERTICALS = [
  { slug: "ai-ml", name: "🤖 AI & Machine Learning" },
  { slug: "web-dev", name: "🌐 Web Development" },
  { slug: "cybersecurity", name: "🛡️ Cybersecurity & CTF" },
  { slug: "cloud-devops", name: "☁️ Cloud & DevOps" },
  { slug: "competitive-programming", name: "🏆 Competitive Programming" },
  { slug: "mobile-dev", name: "📱 Mobile Development" },
  { slug: "ui-ux", name: "🎨 UI / UX Design" },
  { slug: "blockchain", name: "⛓️ Blockchain & Web3" },
  { slug: "iot-embedded", name: "⚡ IoT & Embedded Systems" },
  { slug: "game-dev", name: "🎮 Game Dev & XR" },
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Image Upload Handler
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        return data.url;
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingImage(false);
    }
    return null;
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      {/* Editor Sub-Header Toolbar */}
      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-700">Writing in:</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">
              {ALL_VERTICALS.find((v) => v.slug === selectedVertical)?.name || selectedVertical}
            </span>
            <span>•</span>
            <span className="text-amber-600 font-medium">Draft (Requires Editorial Approval)</span>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Canvas Writing Container (Medium-style) */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Cover Image Selector */}
        <div className="mb-8">
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
          className="w-full resize-none border-none text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 placeholder-gray-300 focus:outline-hidden focus:ring-0 leading-tight"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
          }}
        />

        {/* Floating Formatting Toolbar */}
        <div className="sticky top-28 z-30 my-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md">
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
            <span>{uploadingImage ? "Uploading..." : "Insert Mid-Post Image"}</span>
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
      </main>

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
                  onChange={(e) => setSelectedVertical(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 shadow-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {availableVerticals.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.name}
                    </option>
                  ))}
                </select>
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
