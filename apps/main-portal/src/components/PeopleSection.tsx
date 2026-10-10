"use client";

import type { VerticalMetadata } from "@/lib/verticals";

interface PeopleSectionProps {
  verticals: VerticalMetadata[];
}

export default function PeopleSection({ verticals }: PeopleSectionProps) {
  return (
    <section id="people" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 scroll-mt-16">
      <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-8 border-b border-[#E8E1D2]">
          <div>
            <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
              <span>ssn@codingclub:~$</span>
              <span className="text-[#F43F5E] font-semibold">people</span>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              // 10 VERTICAL HEADS &amp; CORE TEAM
            </h2>
            <div className="mt-1 font-handwriting text-xl text-stone-600 font-bold">
              Guiding technical direction, workshops &amp; editorial pipelines.
            </div>
          </div>

          <div className="text-left md:text-right font-mono text-xs">
            <span className="inline-block px-3 py-1 bg-stone-100 border border-stone-200 text-stone-700 font-bold rounded-md">
              [ 10 leads ]
            </span>
            <div className="text-stone-500 mt-1">Autonomous Wing Leadership</div>
          </div>
        </div>

        {/* Polaroids / ID Badges Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {verticals.map((v, idx) => (
            <div
              key={v.slug}
              className={`relative rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between ${
                idx % 2 === 0 ? "rotate-[-0.7deg]" : "rotate-[0.7deg]"
              }`}
            >
              {/* Scotch Tape on top */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-11 h-3.5 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1deg]" />

              <div className="text-center pt-2">
                {/* Avatar Badge */}
                <div className="mx-auto h-14 w-14 rounded-full bg-stone-900 text-white font-mono font-bold text-base flex items-center justify-center shadow-inner">
                  {v.lead.name.slice(0, 2).toUpperCase()}
                </div>

                <h3 className="mt-3 text-sm font-bold text-stone-900 tracking-tight leading-snug">
                  {v.lead.name}
                </h3>

                <div className="font-mono text-[11px] text-[#F43F5E] font-semibold mt-0.5">
                  {v.name}
                </div>

                <p className="mt-1 text-[11px] text-stone-500 leading-tight">
                  {v.lead.role}
                </p>
              </div>

              {v.lead.github && (
                <div className="mt-4 pt-2 border-t border-stone-100 text-center font-mono text-[10px]">
                  <a
                    href={`https://github.com/${v.lead.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-600 hover:text-[#F43F5E] transition"
                  >
                    @{v.lead.github} ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
