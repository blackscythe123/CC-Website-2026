import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllVerticals } from "@/lib/verticals";

export const metadata = {
  title: "Cross-Vertical Blog Feed | Apex Coding Club",
  description: "Browse articles, tutorials, and research notes from all 10 engineering verticals.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const verticals = getAllVerticals();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-8 sm:flex-row sm:items-end dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Club Engineering Feed
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Unified technical articles published across all 10 verticals through our Git editorial pipeline.
          </p>
        </div>
        <a
          href="/admin"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          <span>Write a Post</span>
          <span className="font-mono opacity-80">/admin</span>
        </a>
      </div>

      {/* Vertical Pills Quick Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400">Filter by Vertical:</span>
        {verticals.map((v) => (
          <Link
            key={v.slug}
            href={`/verticals/${v.slug}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            {v.name}
          </Link>
        ))}
      </div>

      {/* Posts List */}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <article
            key={`${post.vertical}-${post.slug}`}
            className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:border-blue-400 transition dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <Link
                  href={`/verticals/${post.vertical}`}
                  className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 hover:underline dark:bg-blue-950 dark:text-blue-300"
                >
                  {post.vertical}
                </Link>
                <span>{post.date}</span>
              </div>

              <h2 className="mt-3 text-xl font-bold tracking-tight text-gray-900 hover:text-blue-600 dark:text-white">
                <Link href={`/blog/${post.vertical}/${post.slug}`}>{post.title}</Link>
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-3 dark:text-gray-300">
                {post.summary}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
              <span className="text-gray-500">By {post.author}</span>
              <Link
                href={`/blog/${post.vertical}/${post.slug}`}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Read full article &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
