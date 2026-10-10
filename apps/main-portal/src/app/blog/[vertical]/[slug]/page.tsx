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
    title: `${post.title} | Coding Club`,
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

  // Calculate estimated reading time (approx 200 words per minute)
  const plainText = post.contentHtml.replace(/<[^>]+>/g, " ");
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Top Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs font-semibold text-gray-400">
        <Link href="/" className="hover:text-blue-600 transition">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-blue-600 transition">Blog</Link>
        <span>/</span>
        <Link href={`/verticals/${verticalSlug}`} className="text-blue-600 hover:underline">
          {vertical ? vertical.name : verticalSlug}
        </Link>
      </nav>

      {/* Article Header */}
      <header className="border-b border-gray-200 pb-8 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/verticals/${verticalSlug}`}
            className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            {vertical ? vertical.name : verticalSlug}
          </Link>
          <span className="text-xs text-gray-400">• {readingTime} min read</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white leading-tight">
          {post.title}
        </h1>

        {post.summary && (
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            {post.summary}
          </p>
        )}

        {/* Medium-style Author Byline */}
        <div className="mt-6 flex items-center gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm shadow-xs">
            {post.author.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {post.author}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <span>Published on {post.date}</span>
              <span>•</span>
              <span>{readingTime} min read</span>
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image (if uploaded) */}
      {post.coverImage && (
        <div className="my-8 overflow-hidden rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full object-cover max-h-[480px]"
          />
        </div>
      )}

      {/* Medium-style Body Typography & Mid-Post Images */}
      <div
        className="mt-8 space-y-6 text-lg leading-relaxed text-gray-800 dark:text-gray-200 
        [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:dark:text-white [&_h2]:tracking-tight
        [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:dark:text-white
        [&_p]:my-5 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1.5
        [&_code]:rounded-md [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-pink-600 [&_code]:dark:bg-gray-800 [&_code]:dark:text-pink-400
        [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-gray-950 [&_pre]:p-5 [&_pre]:text-sm [&_pre]:text-gray-100 [&_pre]:my-6
        [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:pl-5 [&_blockquote]:my-6 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:dark:text-gray-300
        [&_img]:rounded-2xl [&_img]:my-8 [&_img]:w-full [&_img]:shadow-md [&_img]:border [&_img]:border-gray-100 [&_img]:dark:border-gray-800
        [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-700"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {/* Article Footer & Tags */}
      <footer className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-800 space-y-6">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Tags:</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            href={`/verticals/${verticalSlug}`}
            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            &larr; More from {vertical ? vertical.name : verticalSlug}
          </Link>
          <a
            href="https://ssn-coding-club-cms.vercel.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            Edit in CMS Studio &rarr;
          </a>
        </div>
      </footer>
    </article>
  );
}
