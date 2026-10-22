"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useStudio } from "@/components/shell/StudioContext";
import { useToast } from "@/components/toast/ToastProvider";
import { ALL_VERTICALS, CLUB_VERTICAL } from "@/lib/verticals";
import { Button, ConfirmDialog, EmptyState, Input, Select, Skeleton } from "@/components/ui";
import { NoArticles } from "@/components/illustrations";
import ArticleRow, { type PublishedPost } from "@/components/articles/ArticleRow";
import RepurposeDrawer, { type RepurposePack } from "@/components/articles/RepurposeDrawer";

export default function ArticlesPage() {
  const { user } = useStudio();
  const toast = useToast();

  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState("all");

  const [unpublishing, setUnpublishing] = useState<PublishedPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [repurposeFor, setRepurposeFor] = useState<PublishedPost | null>(null);
  const [pack, setPack] = useState<RepurposePack | null>(null);
  const [packLoading, setPackLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/posts/manage");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load articles");
      setPosts(data.posts || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load articles");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (vertical === "all" || p.vertical === vertical) &&
        (!q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.author.toLowerCase().includes(q))
    );
  }, [posts, query, vertical]);

  const openRepurpose = async (post: PublishedPost) => {
    setRepurposeFor(post);
    setPack(null);
    setPackLoading(true);
    try {
      const res = await fetch(`/api/posts/repurpose?vertical=${encodeURIComponent(post.vertical)}&slug=${encodeURIComponent(post.slug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't generate posts for this article");
      setPack(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate posts for this article");
    } finally {
      setPackLoading(false);
    }
  };

  const unpublish = async () => {
    if (!unpublishing) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/posts/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: unpublishing.vertical, slug: unpublishing.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't unpublish the article");
      toast.success(data.message || `Unpublished “${unpublishing.title}”`);
      setUnpublishing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't unpublish the article");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden text-2xl font-extrabold tracking-tight md:block">Articles</h1>
          <p className="mt-1 text-sm text-muted">Published articles. Heads can unpublish in their vertical; superadmins anywhere.</p>
        </div>
        <Button size="sm" icon={RefreshCw} loading={refreshing} onClick={refresh}>
          Refresh
        </Button>
      </header>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="articles-search" className="sr-only">
            Search articles
          </label>
          <Input id="articles-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, slug or author" className="pl-9" />
        </div>
        <label htmlFor="articles-vertical" className="sr-only">
          Vertical
        </label>
        <Select id="articles-vertical" value={vertical} onChange={(e) => setVertical(e.target.value)} className="sm:w-56">
          <option value="all">All verticals</option>
          {[CLUB_VERTICAL, ...ALL_VERTICALS].map((v) => (
            <option key={v.slug} value={v.slug}>
              {v.name}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-[13px] text-muted" aria-live="polite">
        {loading ? "Loading…" : `${filtered.length} of ${posts.length} articles`}
      </p>

      <div className="mt-3 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={NoArticles}
            title={posts.length ? "No articles match" : "No published articles yet"}
            body={posts.length ? "Try a different search or vertical." : "Approved posts show up here once they're merged."}
            action={
              posts.length ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setVertical("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          filtered.map((post) => (
            <ArticleRow key={`${post.vertical}-${post.slug}`} post={post} onRepurpose={() => openRepurpose(post)} onUnpublish={() => setUnpublishing(post)} />
          ))
        )}
      </div>

      <RepurposeDrawer title={repurposeFor?.title ?? null} loading={packLoading} pack={pack} onClose={() => setRepurposeFor(null)} />

      <ConfirmDialog
        open={Boolean(unpublishing)}
        title="Unpublish this article?"
        loading={deleting}
        confirmLabel="Unpublish"
        onConfirm={unpublish}
        onCancel={() => setUnpublishing(null)}
        message={
          unpublishing ? (
            <>
              <p>
                <strong className="text-text">“{unpublishing.title}”</strong> will be removed from {unpublishing.vertical === "club" ? "club announcements" : unpublishing.vertical}.
              </p>
              <p className="rounded-lg bg-warning-bg p-3 text-warning">
                This commits a deletion straight to <code className="font-mono">main</code> under your GitHub account (@{user.login}). It can be restored from Git history.
              </p>
            </>
          ) : null
        }
      />
    </div>
  );
}
