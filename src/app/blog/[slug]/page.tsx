import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: "Post Not Found" };
  }
  return {
    title: `${post.title} | Coding Club Blog`,
    description: post.summary,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          &larr; Back to all articles
        </Link>
      </div>

      <header className="border-b border-gray-200 pb-8 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          {post.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              {tag}
            </span>
          ))}
          <span className="text-xs text-gray-400">• {post.date}</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
            {post.author ? post.author.slice(0, 2).toUpperCase() : "CC"}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {post.author}
            </div>
            <div className="text-xs text-gray-500">Published on {post.date}</div>
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
        className="mt-8 space-y-4 text-base leading-relaxed text-gray-800 dark:text-gray-200 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:dark:text-white [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:dark:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p]:my-4 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:dark:bg-gray-800 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-gray-900 [&_pre]:p-4 [&_pre]:text-white [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <Link
            href="/blog"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            &larr; More club posts
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            Edit this in /admin &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}
