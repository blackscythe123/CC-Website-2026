"use client";

import { useState, useEffect } from "react";
import StudioNav from "@/components/StudioNav";
import { UserRoleInfo } from "@/lib/roles";
import {
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Search,
  ExternalLink,
  X,
  AlertTriangle,
  Share2,
  Copy,
  Check,
} from "lucide-react";

interface PublishedPost {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  canDelete: boolean;
}

export default function ManagePostsPage() {
  const [user, setUser] = useState<{ login: string; name: string; avatar_url: string } | null>(
    null
  );
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("all");

  const [deleteModalPost, setDeleteModalPost] = useState<PublishedPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorFeedback, setErrorFeedback] = useState("");

  const [repurposeModalPost, setRepurposeModalPost] = useState<PublishedPost | null>(null);
  const [repurposeData, setRepurposeData] = useState<{
    canonicalUrl: string;
    slopWarnings: { word: string; index: number }[];
    twitterThread: string[];
    linkedInPost: string;
    discordSnippet: string;
    whatsAppSnippet: string;
    syndicationMarkdown: string;
  } | null>(null);
  const [repurposeLoading, setRepurposeLoading] = useState(false);
  const [repurposeTab, setRepurposeTab] = useState<"twitter" | "linkedin" | "discord" | "whatsapp">("twitter");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenRepurpose = async (post: PublishedPost) => {
    setRepurposeModalPost(post);
    setRepurposeLoading(true);
    setRepurposeData(null);
    try {
      const res = await fetch(`/api/posts/repurpose?vertical=${encodeURIComponent(post.vertical)}&slug=${encodeURIComponent(post.slug)}`);
      const data = await res.json();
      if (res.ok) {
        setRepurposeData(data);
      } else {
        setErrorFeedback(data.error || "Failed to load syndication pack");
      }
    } catch {
      setErrorFeedback("Failed to load syndication pack");
    } finally {
      setRepurposeLoading(false);
    }
  };

  const fetchPosts = () => {
    fetch("/api/posts/manage")
      .then((res) => res.json())
      .then((data) => {
        if (data.posts) {
          setPosts(data.posts);
        }
        if (data.roleInfo) {
          setRoleInfo(data.roleInfo);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setRoleInfo(data.roleInfo);
          fetchPosts();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDeletePost = async () => {
    if (!deleteModalPost) return;

    setDeleting(true);
    setFeedback("");
    setErrorFeedback("");

    try {
      const res = await fetch("/api/posts/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: deleteModalPost.vertical,
          slug: deleteModalPost.slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unpublish article");
      }

      setFeedback(data.message || `Article '${deleteModalPost.slug}' unpublished successfully.`);
      setDeleteModalPost(null);
      fetchPosts();
    } catch (err: unknown) {
      setErrorFeedback(err instanceof Error ? err.message : "Error deleting article");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVertical = verticalFilter === "all" || p.vertical === verticalFilter;
    return matchesSearch && matchesVertical;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
      <StudioNav user={user} roleInfo={roleInfo} />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                Article Governance
              </span>
              <span className="text-xs text-gray-400">Content Moderation &amp; Lifecycle</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Published Articles
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Vertical Heads can remove articles in their assigned vertical; Super Admins have global removal authority.
            </p>
          </div>

          <button
            onClick={fetchPosts}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
          >
            Refresh Articles
          </button>
        </div>

        {/* Feedback Alerts */}
        {feedback && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {errorFeedback && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, slug, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-800 shadow-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <select
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">All Technical Verticals ({posts.length})</option>
            <option value="club">📢 Club Announcements</option>
            <option value="ai-ml">🤖 AI / ML</option>
            <option value="ar-vr-game-dev">🎮 AR, VR &amp; Game Dev</option>
            <option value="competitive-programming">🏆 Competitive Programming</option>
            <option value="cybersecurity">🛡️ Cyber Security</option>
            <option value="ssnhacks">⚡ SSN Hacks</option>
            <option value="design-ui-ux">🎨 Design &amp; UI/UX</option>
            <option value="full-stack">🌐 Full Stack</option>
            <option value="open-source">💻 Open Source (OSS)</option>
          </select>
        </div>

        {/* Post Items */}
        {filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800">No published articles found</h3>
            <p className="text-sm text-gray-500">
              Try adjusting your search query or vertical filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <div
                key={`${post.vertical}-${post.slug}`}
                className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between hover:shadow-sm transition"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                      {post.vertical}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      /{post.slug}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{post.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    {post.title}
                  </h3>
                  {post.summary && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {post.summary}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    By <span className="font-semibold text-gray-600">@{post.author}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://ssn-coding-club-wine.vercel.app/blog/${post.vertical}/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <span>Read</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    onClick={() => handleOpenRepurpose(post)}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                    title="Generate syndication snippets for X, LinkedIn, Discord & WhatsApp"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Repurpose</span>
                  </button>

                  {post.canDelete ? (
                    <button
                      onClick={() => setDeleteModalPost(post)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                      title="Unpublish article"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Unpublish</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">
                      Protected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Repurpose Modal */}
        {repurposeModalPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
                  <Share2 className="h-5 w-5" />
                  <span>Content Repurposing &amp; Syndication</span>
                </div>
                <button
                  onClick={() => setRepurposeModalPost(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">{repurposeModalPost.title}</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Canonical URL: https://{repurposeModalPost.vertical}.codingclub.tech/posts/{repurposeModalPost.slug}
                </p>
              </div>

              {repurposeLoading ? (
                <div className="py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                  <p className="mt-3 text-xs text-gray-500">Generating anti-slop syndication artifacts...</p>
                </div>
              ) : repurposeData ? (
                <div className="space-y-4">
                  {repurposeData.slopWarnings && repurposeData.slopWarnings.length > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                      <strong>AI Slop Quality Warning:</strong> {repurposeData.slopWarnings.length} banned generic word(s) detected in source article ({repurposeData.slopWarnings.slice(0, 4).map((w) => `"${w.word}"`).join(", ")}). Consider revising to meet human engineering standards.
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 gap-2">
                    <button
                      onClick={() => setRepurposeTab("twitter")}
                      className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                        repurposeTab === "twitter"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Twitter / X Thread (6)
                    </button>
                    <button
                      onClick={() => setRepurposeTab("linkedin")}
                      className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                        repurposeTab === "linkedin"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      LinkedIn Post
                    </button>
                    <button
                      onClick={() => setRepurposeTab("discord")}
                      className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                        repurposeTab === "discord"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Discord Announcement
                    </button>
                    <button
                      onClick={() => setRepurposeTab("whatsapp")}
                      className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                        repurposeTab === "whatsapp"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      WhatsApp Broadcast
                    </button>
                  </div>

                  {/* Tab Panels */}
                  {repurposeTab === "twitter" && (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-xs font-semibold text-gray-500">6-Part Technical Thread</span>
                        <button
                          onClick={() => copyToClipboard(repurposeData.twitterThread.join("\n\n---\n\n"), "twitter-all")}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {copiedKey === "twitter-all" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === "twitter-all" ? "Copied All!" : "Copy Full Thread"}</span>
                        </button>
                      </div>
                      {repurposeData.twitterThread.map((tweet, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                            <span>Tweet {i + 1} of 6</span>
                            <span className={tweet.length > 280 ? "text-red-600 font-bold" : "text-gray-500"}>
                              {tweet.length} / 280 chars
                            </span>
                          </div>
                          <p className="text-xs text-gray-800 whitespace-pre-line font-sans">{tweet}</p>
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => copyToClipboard(tweet, `tweet-${i}`)}
                              className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                            >
                              {copiedKey === `tweet-${i}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedKey === `tweet-${i}` ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {repurposeTab === "linkedin" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500">Professional Engineering Showcase</span>
                        <button
                          onClick={() => copyToClipboard(repurposeData.linkedInPost, "linkedin")}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {copiedKey === "linkedin" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === "linkedin" ? "Copied!" : "Copy LinkedIn Post"}</span>
                        </button>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 max-h-96 overflow-y-auto">
                        <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                          {repurposeData.linkedInPost}
                        </p>
                      </div>
                    </div>
                  )}

                  {repurposeTab === "discord" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500">Community Channel Highlight</span>
                        <button
                          onClick={() => copyToClipboard(repurposeData.discordSnippet, "discord")}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {copiedKey === "discord" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === "discord" ? "Copied!" : "Copy Discord Snippet"}</span>
                        </button>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-900 text-gray-100 p-4 font-mono text-xs max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-line">{repurposeData.discordSnippet}</pre>
                      </div>
                    </div>
                  )}

                  {repurposeTab === "whatsapp" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500">WhatsApp Broadcast Snippet</span>
                        <button
                          onClick={() => copyToClipboard(repurposeData.whatsAppSnippet, "whatsapp")}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {copiedKey === "whatsapp" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === "whatsapp" ? "Copied!" : "Copy WhatsApp Snippet"}</span>
                        </button>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 max-h-96 overflow-y-auto">
                        <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed">
                          {repurposeData.whatsAppSnippet}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-red-500">
                  Unable to load repurposing content for this article.
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">
                  Strictly enforced anti-slop guidelines: no generic hype, specific technical takeaways.
                </span>
                <button
                  type="button"
                  onClick={() => setRepurposeModalPost(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Confirm Unpublish</span>
                </div>
                <button
                  onClick={() => setDeleteModalPost(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">
                Are you sure you want to unpublish and delete{" "}
                <strong>&ldquo;{deleteModalPost.title}&rdquo;</strong> from{" "}
                <span className="font-semibold text-blue-700">{deleteModalPost.vertical}</span>?
              </p>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <strong>Git Provenance Notice:</strong> This action will commit a deletion directly to{" "}
                <code>main</code> under your GitHub username (<code>@{user?.login}</code>).
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalPost(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? "Deleting from Git..." : "Confirm & Delete Article"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
