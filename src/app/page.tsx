import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllEvents } from "@/lib/events";

export default function Home() {
  const posts = getAllPosts();
  const events = getAllEvents();

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Powered by Decap CMS + Git + Next.js
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
              Student Tech Stories,{" "}
              <span className="text-blue-600 dark:text-blue-400">Committed to Git</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
              A zero-database content management platform for our club. Non-technical members write articles in an intuitive visual editor, and Decap CMS saves the content straight into GitHub.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
              >
                <span>Launch CMS Studio</span>
                <span className="rounded bg-blue-500/40 px-1.5 py-0.5 text-xs font-mono">/admin</span>
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Read Blog Posts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">1. Write in /admin</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Anyone with access opens Decap CMS in the browser. A clean WYSIWYG editor lets anyone write posts, upload images, and preview live.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">2. Committed to GitHub</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Using your GitHub key stored safely in Vercel, Decap CMS automatically commits the article as Markdown straight into your repository.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">3. Zero Database Cost</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Vercel triggers a build and serves blazing fast static HTML globally. No PostgreSQL servers, no expensive database bills.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Blog Posts */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Recent Articles
            </h2>
            <p className="text-sm text-gray-500">Read news and technical posts from our members</p>
          </div>
          <Link
            href="/blog"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
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
                <h3 className="mt-3 text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-white">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {post.summary}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500">By {post.author}</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Read article &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Upcoming Events &amp; Workshops
              </h2>
              <p className="text-sm text-gray-500">Join our upcoming sessions</p>
            </div>
            <Link
              href="/events"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View events &rarr;
            </Link>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.slug}
                className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  {event.location}
                </div>
                <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {event.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {event.description}
                </p>
                {event.registrationUrl && (
                  <div className="mt-4">
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                    >
                      Register Now
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
