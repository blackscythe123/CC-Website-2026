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
    title: `${vertical.name} | SSN Coding Club`,
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
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-stone-600 hover:text-stone-900 transition"
        >
          &larr; Back to All 8 Verticals
        </Link>
      </div>

      {/* Vertical Header Banner */}
      <header className="relative rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-6 sm:p-12 shadow-lg overflow-hidden">
        {/* Scotch Tape on top */}
        <div className="absolute -top-3 left-16 w-16 h-5 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-2deg]" />

        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="rounded bg-rose-50 px-2.5 py-0.5 font-bold text-[#F43F5E] border border-rose-100">
                WING HUB
              </span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-500">slug: /{vertical.slug}</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
              {vertical.name}
            </h1>

            <p className="text-lg font-medium text-stone-700">
              &ldquo;{vertical.tagline}&rdquo;
            </p>

            <p className="text-sm sm:text-base leading-relaxed text-stone-600">
              {vertical.description}
            </p>

            {/* Core Tech Stack */}
            {vertical.topics && (
              <div className="pt-2">
                <div className="font-mono text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Tech Stack &amp; Focus Areas:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {vertical.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-1 font-mono text-xs font-medium text-stone-700 shadow-2xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vertical Head Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:w-80 shadow-sm shrink-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Vertical Leadership
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 font-mono font-bold text-white text-sm shadow-inner">
                {vertical.lead.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-stone-900 text-sm">
                  {vertical.lead.name}
                </div>
                <div className="text-xs text-stone-500">{vertical.lead.role}</div>
              </div>
            </div>
            {vertical.lead.github && (
              <div className="mt-4 pt-3 border-t border-stone-100 font-mono text-xs flex items-center justify-between">
                <span className="text-stone-400">GitHub:</span>
                <a
                  href={`https://github.com/${vertical.lead.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-stone-900 hover:text-[#F43F5E] transition"
                >
                  @{vertical.lead.github} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Vertical Articles Section */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E8E1D2] pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-mono text-xs text-stone-500">
              ssn@codingclub:~$ list-articles --vertical {vertical.slug}
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
              Articles &amp; Workshops by {vertical.name}
            </h2>
          </div>

          <a
            href="https://ssn-coding-club-cms.vercel.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-stone-900 px-4 py-2 text-xs font-mono font-bold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <span>Write for this Vertical</span>
            <span className="text-stone-400">(/admin) ↗</span>
          </a>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500 font-mono">
            No posts published in this vertical yet. Use{" "}
            <a
              href="https://ssn-coding-club-cms.vercel.app/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F43F5E] underline font-bold"
            >
              CMS Studio
            </a>{" "}
            to draft the first article!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post, idx) => (
              <article
                key={post.slug}
                className={`relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 ${
                  idx % 2 === 0 ? "rotate-[-0.3deg]" : "rotate-[0.3deg]"
                }`}
              >
                {/* Scotch Tape */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1deg]" />

                <div>
                  <div className="flex items-center justify-between font-mono text-xs text-stone-400">
                    <div className="flex gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span>{post.date}</span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-stone-900 hover:text-[#F43F5E] transition-colors leading-snug">
                    <Link href={`/blog/${post.vertical}/${post.slug}`}>{post.title}</Link>
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600 line-clamp-3 font-sans">
                    {post.summary}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 font-mono text-xs">
                  <span className="text-stone-500">By {post.author}</span>
                  <Link
                    href={`/blog/${post.vertical}/${post.slug}`}
                    className="font-bold text-[#F43F5E] hover:underline"
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
