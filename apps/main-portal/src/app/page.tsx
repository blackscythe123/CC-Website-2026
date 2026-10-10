import Link from "next/link";
import { getAllVerticals } from "@/lib/verticals";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
  const verticals = getAllVerticals();
  const recentPosts = getAllPosts().slice(0, 6);

  return (
    <div className="space-y-20 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-white py-24 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Monorepo Architecture • 10 Verticals • Centralized CMS
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
              The Apex Engineering Hub,{" "}
              <span className="text-blue-600 dark:text-blue-400">10 Specialized Wings</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
              Welcome to the central portal of Apex Coding Club. Each technical vertical operates autonomously with its own leadership, editorial pipeline, and Git-backed content stream.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#verticals"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition"
              >
                Explore 10 Verticals
              </a>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                Read All Articles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Verticals Grid Section */}
      <section id="verticals" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end dark:border-gray-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Specialized Wings
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Our 10 Engineering Verticals
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Click any vertical to visit its individual page powered by our single dynamic template.
            </p>
          </div>
          <span className="text-xs font-medium text-gray-400">
            {verticals.length} Active Verticals
          </span>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v, idx) => (
            <Link
              key={v.slug}
              href={`/verticals/${v.slug}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs transition-all hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 font-mono text-xs font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    Lead: {v.lead.name}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900 group-hover:text-blue-600 dark:text-white">
                  {v.name}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {v.tagline}
                </p>

                {v.topics && v.topics.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {v.topics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition dark:border-gray-800 dark:text-blue-400">
                <span>View Vertical Hub</span>
                <span>&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial Approval Architecture Callout */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 sm:p-12 dark:border-blue-950 dark:from-gray-900 dark:to-gray-900">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Role-Based Approval Workflow
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              How Vertical Content Gets Published
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Any club member can write a blog or announcement for their vertical in the CMS Studio. Before going live, it follows a strict Git approval workflow:
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <span className="text-xs font-bold text-gray-400">1. MEMBER DRAFTS</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white">
                  Creates post in /admin
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Decap opens a Git feature branch &amp; PR.
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <span className="text-xs font-bold text-indigo-500">2. VERTICAL HEAD REVIEWS</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white">
                  Inspects &amp; approves
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Lead approves draft in the CMS Workflow tab.
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-xs dark:bg-gray-800">
                <span className="text-xs font-bold text-emerald-600">3. VERCEL DEPLOYS</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white">
                  Merged into main
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PR automatically merged; Vercel rebuilds in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Cross-Vertical Posts */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Recent Articles Across All Verticals
            </h2>
            <p className="text-sm text-gray-500">Latest technical articles from our club community</p>
          </div>
          <Link
            href="/blog"
            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            All articles &rarr;
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recentPosts.map((post) => (
            <article
              key={`${post.vertical}-${post.slug}`}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:border-blue-400 transition dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {post.vertical}
                  </span>
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
                  Read &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
