"use client";

export default function AboutSection() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 scroll-mt-16">
      <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-8 border-b border-[#E8E1D2]">
          <div>
            <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
              <span>ssn@codingclub:~$</span>
              <span className="text-[#F43F5E] font-semibold">about</span>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              // HOW WE BUILD &amp; OPERATE
            </h2>
            <div className="mt-1 font-handwriting text-xl text-stone-600 font-bold">
              Autonomous wings with a unified open-source backbone.
            </div>
          </div>

          <div className="text-left md:text-right font-mono text-xs">
            <span className="inline-block px-3 py-1 bg-stone-100 border border-stone-200 text-stone-700 font-bold rounded-md">
              [ git-backed headless cms ]
            </span>
            <div className="text-stone-500 mt-1">Decap CMS + Next.js Monorepo</div>
          </div>
        </div>

        {/* Content Columns */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          
          {/* Column 1: Philosophy */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-[#F43F5E]">
                // 01. PHILOSOPHY
              </span>
              <h3 className="mt-2 text-xl font-bold text-stone-900 tracking-tight">
                Curious Minds Who Build
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
                Coding Club is designed to eliminate gatekeeping in technology. Whether you are curious about fine-tuning open-source LLMs, writing low-level kernel drivers, or crafting pixel-perfect interfaces, there is a dedicated vertical for you.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100">
              <div className="rounded-xl border border-dashed border-[#F43F5E]/60 bg-[#FFF5F5] p-3 text-center">
                <span className="font-mono text-xs font-bold text-stone-800">
                  &ldquo;learn build collaborate <span className="text-[#F43F5E]">repeat._</span>&rdquo;
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Role-based Git Editorial Workflow */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs lg:col-span-2">
            <span className="font-mono text-xs font-bold text-emerald-600">
              // 02. EDITORIAL PIPELINE
            </span>
            <h3 className="mt-2 text-xl font-bold text-stone-900 tracking-tight">
              Decap CMS Git Workflow
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
              Any club member can write tutorials, project logs, or research summaries directly in the CMS Studio without needing Git write access:
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3 font-mono text-xs">
              <div className="rounded-xl border border-stone-200 bg-[#FAF7EE] p-4">
                <span className="text-stone-500 font-bold">1. MEMBER DRAFTS</span>
                <div className="mt-1.5 font-bold text-stone-900 text-sm font-sans">
                  Writes in /admin
                </div>
                <p className="mt-1 text-[11px] text-stone-600 font-sans">
                  Decap opens a Git feature branch &amp; pull request automatically.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#FAF7EE] p-4">
                <span className="text-indigo-600 font-bold">2. LEAD REVIEWS</span>
                <div className="mt-1.5 font-bold text-stone-900 text-sm font-sans">
                  Inspects &amp; Approves
                </div>
                <p className="mt-1 text-[11px] text-stone-600 font-sans">
                  Vertical head evaluates article accuracy in the Editorial Workflow tab.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#FAF7EE] p-4">
                <span className="text-emerald-600 font-bold">3. AUTO-DEPLOY</span>
                <div className="mt-1.5 font-bold text-stone-900 text-sm font-sans">
                  Merged to main
                </div>
                <p className="mt-1 text-[11px] text-stone-600 font-sans">
                  Vercel rebuilds statically in seconds, publishing live to the portal.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100 font-mono text-xs">
              <span className="text-stone-500">Decap Headless CMS + GitHub OAuth</span>
              <a
                href="https://ssn-coding-club-cms.vercel.app/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F43F5E] font-bold hover:underline"
              >
                Launch CMS Studio ↗
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
