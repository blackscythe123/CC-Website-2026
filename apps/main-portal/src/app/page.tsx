import Link from "next/link";
import { getAllVerticals } from "@/lib/verticals";
import { getAllPosts } from "@/lib/posts";
import HeroDesk from "@/components/HeroDesk";
import VerticalsTabs from "@/components/VerticalsTabs";
import EventsSection from "@/components/EventsSection";
import ProjectsSection from "@/components/ProjectsSection";
import PeopleSection from "@/components/PeopleSection";
import AboutSection from "@/components/AboutSection";

export default function HomePage() {
  const verticals = getAllVerticals();
  const recentPosts = getAllPosts().slice(0, 6);

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* 1. Hero Desk & Terminal Canvas */}
      <HeroDesk />

      {/* 2. Our 10 Verticals (Sticky Note Tab Bar) */}
      <VerticalsTabs verticals={verticals} />

      {/* 3. Events & Workshops Bulletin */}
      <EventsSection />

      {/* 4. Recent Cross-Vertical Articles Feed */}
      <section id="blogs" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-12 scroll-mt-16">
        <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-8 border-b border-[#E8E1D2]">
            <div>
              <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
                <span>ssn@codingclub:~$</span>
                <span className="text-[#F43F5E] font-semibold">blogs</span>
              </div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
                // RECENT CROSS-VERTICAL ARTICLES
              </h2>
              <div className="mt-1 font-handwriting text-xl text-stone-600 font-bold">
                Technical articles &amp; writeups from club members.
              </div>
            </div>

            <div className="text-left md:text-right font-mono text-xs">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white font-bold rounded-md hover:bg-stone-800 transition"
              >
                <span>view all articles</span>
                <span>&rarr;</span>
              </Link>
              <div className="text-stone-500 mt-1">Written via Decap CMS Git workflow</div>
            </div>
          </div>

          {/* Notebook Article Cards Grid */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post, idx) => (
              <article
                key={`${post.vertical}-${post.slug}`}
                className={`relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 ${
                  idx % 3 === 0 ? "rotate-[-0.4deg]" : idx % 3 === 1 ? "rotate-[0.4deg]" : "rotate-0"
                }`}
              >
                {/* Scotch Tape on top */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1deg]" />

                <div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="rounded bg-rose-50 px-2.5 py-0.5 font-bold text-[#F43F5E] border border-rose-100">
                      {post.vertical}
                    </span>
                    <span className="text-stone-400">{post.date}</span>
                  </div>

                  <h3 className="mt-3.5 text-lg font-bold text-stone-900 hover:text-[#F43F5E] transition-colors leading-snug">
                    <Link href={`/blog/${post.vertical}/${post.slug}`}>{post.title}</Link>
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600 line-clamp-3 font-sans">
                    {post.summary}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 font-mono text-xs">
                  <span className="text-stone-500 font-medium">By {post.author}</span>
                  <Link
                    href={`/blog/${post.vertical}/${post.slug}`}
                    className="font-bold text-[#F43F5E] hover:underline"
                  >
                    Read &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* 5. Open Source Projects */}
      <ProjectsSection />

      {/* 6. Vertical Heads & Core Team */}
      <PeopleSection verticals={verticals} />

      {/* 7. How We Build & Manifesto */}
      <AboutSection />
    </div>
  );
}
