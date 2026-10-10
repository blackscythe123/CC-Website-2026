import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllVerticals } from "@/lib/verticals";

export const metadata = {
  title: "Cross-Vertical Blog Feed | SSN Coding Club",
  description: "Browse articles, tutorials, and research notes across all 10 engineering verticals.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const verticals = getAllVerticals();

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Top Banner Card */}
      <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-6 sm:p-10 shadow-lg relative overflow-hidden">
        {/* Scotch Tape on top */}
        <div className="absolute -top-3 left-16 w-16 h-5 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-2deg]" />

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-[#E8E1D2]">
          <div>
            <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
              <span>ssn@codingclub:~$</span>
              <span className="text-[#F43F5E] font-semibold">blogs</span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900">
              // CLUB ENGINEERING FEED
            </h1>
            <div className="mt-1 font-handwriting text-xl sm:text-2xl text-stone-600 font-bold">
              Cross-vertical tutorials, project deep-dives &amp; research.
            </div>
          </div>

          <div className="text-left md:text-right font-mono text-xs space-y-2">
            <a
              href="https://ssn-coding-club-cms.vercel.app/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 font-bold text-white shadow-sm hover:bg-stone-800 transition"
            >
              <span>Write a Post</span>
              <span className="opacity-70 text-stone-300">(/admin) ↗</span>
            </a>
            <div className="text-stone-500">{posts.length} published articles</div>
          </div>
        </div>

        {/* Vertical Filter Pills (Sticky Notes style) */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-stone-500 mr-1">Filter by Wing:</span>
          <span className="rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1 font-mono text-xs font-semibold text-amber-800 shadow-2xs">
            #📢 Club Announcements
          </span>
          {verticals.map((v) => (
            <Link
              key={v.slug}
              href={`/verticals/${v.slug}`}
              className="rounded-lg border border-stone-300/80 bg-white px-3 py-1 font-mono text-xs font-medium text-stone-700 hover:border-stone-900 hover:text-stone-900 hover:bg-stone-50 transition shadow-2xs"
            >
              #{v.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Posts Grid with Scotch Tape */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, idx) => (
          <article
            key={`${post.vertical}-${post.slug}`}
            className={`relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 ${
              idx % 3 === 0 ? "rotate-[-0.4deg]" : idx % 3 === 1 ? "rotate-[0.4deg]" : "rotate-0"
            }`}
          >
            {/* Scotch Tape on top */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1deg]" />

            <div>
              <div className="flex items-center justify-between font-mono text-xs">
                {post.vertical === "club" ? (
                  <span className="rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                    📢 Club Announcement
                  </span>
                ) : (
                  <Link
                    href={`/verticals/${post.vertical}`}
                    className="rounded bg-rose-50 px-2 py-0.5 font-bold text-[#F43F5E] border border-rose-100 hover:bg-rose-100 transition"
                  >
                    {post.vertical}
                  </Link>
                )}
                <span className="text-stone-400">{post.date}</span>
              </div>

              <h2 className="mt-3.5 text-lg font-bold text-stone-900 hover:text-[#F43F5E] transition-colors leading-snug">
                <Link href={`/blog/${post.vertical}/${post.slug}`}>{post.title}</Link>
              </h2>

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
                Read full article &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
