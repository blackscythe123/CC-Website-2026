import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost } from "@/lib/posts";
import { getVerticalBySlug } from "@/lib/verticals";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    vertical: post.vertical,
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string; slug: string }>;
}): Promise<Metadata> {
  const { vertical, slug } = await params;
  const post = await getPost(vertical, slug);
  if (!post) return { title: "Article Not Found" };

  return {
    title: `${post.title} | SSN Coding Club`,
    description: post.summary,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ vertical: string; slug: string }>;
}) {
  const { vertical: verticalSlug, slug } = await params;
  const post = await getPost(verticalSlug, slug);

  if (!post) {
    notFound();
  }

  const vertical = getVerticalBySlug(verticalSlug);

  // Calculate estimated reading time
  const plainText = post.contentHtml.replace(/<[^>]+>/g, " ");
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      {/* Top Terminal Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-xs text-stone-500">
        <Link href="/" className="hover:text-stone-900 transition">home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-stone-900 transition">blog</Link>
        <span>/</span>
        {verticalSlug === "club" ? (
          <span className="text-amber-700 font-semibold">📢 Club Announcements</span>
        ) : (
          <Link href={`/verticals/${verticalSlug}`} className="text-[#F43F5E] hover:underline font-semibold">
            {vertical ? vertical.name : verticalSlug}
          </Link>
        )}
      </nav>

      {/* Article Header Card */}
      <header className="relative rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-6 sm:p-10 shadow-lg overflow-hidden">
        {/* Scotch Tape on top */}
        <div className="absolute -top-3 left-14 w-16 h-5 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-2deg]" />

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {verticalSlug === "club" ? (
            <span className="rounded bg-amber-50 px-2.5 py-0.5 font-bold text-amber-800 border border-amber-200">
              📢 Coding Club Announcement
            </span>
          ) : (
            <Link
              href={`/verticals/${verticalSlug}`}
              className="rounded bg-rose-50 px-2.5 py-0.5 font-bold text-[#F43F5E] border border-rose-100 hover:bg-rose-100 transition"
            >
              {vertical ? vertical.name : verticalSlug}
            </Link>
          )}
          <span className="text-stone-400">•</span>
          <span className="text-stone-500">{readingTime} min read</span>
          <span className="text-stone-400">•</span>
          <span className="text-stone-500">{post.date}</span>
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl lg:text-5xl leading-tight">
          {post.title}
        </h1>

        {post.summary && (
          <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed font-sans">
            {post.summary}
          </p>
        )}

        {/* Author Byline */}
        <div className="mt-6 flex items-center gap-3 pt-6 border-t border-[#E8E1D2]">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 font-mono font-bold text-white text-sm shadow-xs">
            {post.author.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm">
              {post.author}
            </div>
            <div className="font-mono text-xs text-stone-500">
              Editorial Pipeline • {verticalSlug === "club" ? "Coding Club Official" : `${vertical ? vertical.name : "Wing"} Contributor`}
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image (if present) */}
      {post.coverImage && (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 shadow-md">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full object-cover max-h-[480px]"
          />
        </div>
      )}

      {/* Article Content Container */}
      <div className="rounded-3xl border border-[#E5E0D5] bg-white p-6 sm:p-12 shadow-sm">
        <div
          className="space-y-6 text-base sm:text-lg leading-relaxed text-stone-800
          [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-stone-900 [&_h2]:tracking-tight
          [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-stone-900
          [&_p]:my-4 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1.5
          [&_code]:rounded-md [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-[#F43F5E]
          [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-[#16161A] [&_pre]:p-5 [&_pre]:text-sm [&_pre]:text-stone-100 [&_pre]:my-6 [&_pre]:border [&_pre]:border-stone-800
          [&_blockquote]:border-l-4 [&_blockquote]:border-[#F43F5E] [&_blockquote]:bg-rose-50/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-6 [&_blockquote]:italic [&_blockquote]:text-stone-700
          [&_img]:rounded-2xl [&_img]:my-8 [&_img]:w-full [&_img]:shadow-md [&_img]:border [&_img]:border-stone-200
          [&_a]:text-[#F43F5E] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-rose-700"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </div>

      {/* Article Footer */}
      <footer className="rounded-2xl border border-stone-200 bg-[#FFFDF8] p-6 shadow-xs space-y-6 font-mono text-xs">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-stone-500">Tags:</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-stone-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-200">
          {verticalSlug === "club" ? (
            <Link href="/blog" className="font-bold text-amber-700 hover:underline">
              &larr; More Club Announcements &amp; Articles
            </Link>
          ) : (
            <Link
              href={`/verticals/${verticalSlug}`}
              className="font-bold text-[#F43F5E] hover:underline"
            >
              &larr; More from {vertical ? vertical.name : verticalSlug}
            </Link>
          )}
          <a
            href="https://ssn-coding-club-cms.vercel.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-500 hover:text-stone-900 transition"
          >
            Edit in CMS Studio (/admin) ↗
          </a>
        </div>
      </footer>
    </article>
  );
}
