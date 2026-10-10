import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog & Articles | Coding Club",
  description: "Read technical articles, club announcements, and workshop notes.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-8 sm:flex-row sm:items-end dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Club Blog &amp; Notes
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Written by students, for students. Published directly through Decap CMS.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <span>Write a Post</span>
          <span className="font-mono text-xs opacity-80">/admin</span>
        </Link>
      </div>

      <div className="mt-10 space-y-8">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            No posts found. Open <Link href="/admin" className="text-blue-600 underline">/admin</Link> to create your first post!
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <time dateTime={post.date}>{post.date}</time>
                <span>•</span>
                <span>By {post.author}</span>
                {post.tags && post.tags.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 group-hover:text-blue-600 dark:text-white">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>

              <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                {post.summary}
              </p>

              <div className="mt-4">
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Read full article &rarr;
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
