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
    title: `${post.title} | Apex Coding Club`,
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

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Navigation breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-blue-600">Blog</Link>
        <span>/</span>
        <Link href={`/verticals/${verticalSlug}`} className="text-blue-600 hover:underline">
          {vertical ? vertical.name : verticalSlug}
        </Link>
      </div>

      <header className="border-b border-gray-200 pb-8 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/verticals/${verticalSlug}`}
            className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            {vertical ? vertical.name : verticalSlug}
          </Link>
          <span className="text-xs text-gray-400">• {post.date}</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
          {post.title}
        </h1>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
            {post.author.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {post.author}
            </div>
            <div className="text-xs text-gray-500">Published in {vertical ? vertical.name : verticalSlug}</div>
          </div>
        </div>

        {post.summary && (
          <p className="mt-6 text-lg italic text-gray-600 dark:text-gray-300">
            {post.summary}
          </p>
        )}
      </header>

      {/* Rendered Markdown Body */}
      <div
        className="mt-8 space-y-4 text-base leading-relaxed text-gray-800 dark:text-gray-200 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:dark:text-white [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:dark:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p]:my-4 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:dark:bg-gray-800 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-gray-900 [&_pre]:p-4 [&_pre]:text-white"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <Link
            href={`/verticals/${verticalSlug}`}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            &larr; More from {vertical ? vertical.name : verticalSlug}
          </Link>
          <a
            href="/admin"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            Edit in CMS Studio &rarr;
          </a>
        </div>
      </div>
    </article>
  );
}
