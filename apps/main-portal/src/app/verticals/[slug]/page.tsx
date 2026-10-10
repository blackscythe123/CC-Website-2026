import Link from "next/link";
import { notFound } from "next/navigation";
import { getVerticalBySlug, getAllVerticalSlugs } from "@/lib/verticals";
import { getPostsByVertical } from "@/lib/posts";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllVerticalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vertical = getVerticalBySlug(slug);
  if (!vertical) return { title: "Vertical Not Found" };

  return {
    title: `${vertical.name} | Apex Coding Club`,
    description: vertical.tagline,
  };
}

export default async function VerticalDynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vertical = getVerticalBySlug(slug);

  if (!vertical) {
    notFound();
  }

  const posts = getPostsByVertical(slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Back button */}
      <div>
        <Link
          href="/#verticals"
          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          &larr; Back to All 10 Verticals
        </Link>
      </div>

      {/* Vertical Header Banner */}
      <header className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Vertical Hub
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
              {vertical.name}
            </h1>
            <p className="mt-3 text-lg font-medium text-gray-600 dark:text-gray-300">
              {vertical.tagline}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {vertical.description}
            </p>

            {/* Core Tech Stack */}
            {vertical.topics && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">Tech Stack:</span>
                {vertical.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Vertical Head Card */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6 sm:w-80 dark:border-gray-800 dark:bg-gray-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Vertical Leadership
            </span>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm">
                {vertical.lead.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-sm">
                  {vertical.lead.name}
                </div>
                <div className="text-xs text-gray-500">{vertical.lead.role}</div>
              </div>
            </div>
            {vertical.lead.github && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs">
                <span className="text-gray-500">GitHub: </span>
                <span className="font-mono text-gray-800 dark:text-gray-200">
                  @{vertical.lead.github}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Vertical Articles Section */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Articles &amp; Workshops by {vertical.name}
            </h2>
            <p className="text-xs text-gray-500">
              Written by vertical members, reviewed by {vertical.lead.name}
            </p>
          </div>

          <a
            href="/admin"
            className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <span>Write for this Vertical</span>
            <span className="font-mono opacity-80">/admin</span>
          </a>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
            No posts published in this vertical yet. Use <a href="/admin" className="text-blue-600 underline">CMS Studio</a> to write the first post!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:border-blue-400 transition dark:border-gray-800 dark:bg-gray-900"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span>{post.date}</span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-gray-900 hover:text-blue-600 dark:text-white">
                    <Link href={`/blog/${post.vertical}/${post.slug}`}>{post.title}</Link>
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-3 dark:text-gray-400">
                    {post.summary}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
                  <span className="text-gray-500">By {post.author}</span>
                  <Link
                    href={`/blog/${post.vertical}/${post.slug}`}
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Read article &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
