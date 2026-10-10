"use client";

import { useState } from "react";
import Link from "next/link";
import type { VerticalMetadata } from "@/lib/verticals";

interface VerticalsTabsProps {
  verticals: VerticalMetadata[];
}

// Pastel sticky note themes matching the mockup
const STICKY_COLORS = [
  { bg: "bg-[#E0F2FE]", border: "border-[#BAE6FD]", text: "text-sky-900", accent: "#0284C7" },
  { bg: "bg-[#FFE4E6]", border: "border-[#FECDD3]", text: "text-rose-900", accent: "#F43F5E" },
  { bg: "bg-[#DCFCE7]", border: "border-[#BBF7D0]", text: "text-emerald-900", accent: "#10B981" },
  { bg: "bg-[#FFEDD5]", border: "border-[#FED7AA]", text: "text-orange-900", accent: "#F97316" },
  { bg: "bg-[#EDE9FE]", border: "border-[#DDD6FE]", text: "text-purple-900", accent: "#8B5CF6" },
  { bg: "bg-[#FEF9C3]", border: "border-[#FEF08A]", text: "text-amber-900", accent: "#EAB308" },
  { bg: "bg-[#CFFAFE]", border: "border-[#A5F3FC]", text: "text-cyan-900", accent: "#06B6D4" },
  { bg: "bg-[#FEF3C7]", border: "border-[#FDE68A]", text: "text-amber-900", accent: "#F59E0B" },
  { bg: "bg-[#CCFBF1]", border: "border-[#99F6E4]", text: "text-teal-900", accent: "#14B8A6" },
  { bg: "bg-[#FCE7F3]", border: "border-[#FBCFE8]", text: "text-pink-900", accent: "#EC4899" },
];

export default function VerticalsTabs({ verticals }: VerticalsTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"tabs" | "grid">("tabs");

  const activeVertical = verticals[selectedIndex] || verticals[0];
  const activeColor = STICKY_COLORS[selectedIndex % STICKY_COLORS.length];

  return (
    <section id="verticals" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 scroll-mt-16">
      {/* SECTION CONTAINER (Retro Mac / Paper Frame) */}
      <div className="rounded-3xl border border-[#E5E0D5] bg-[#FFFDF8] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
        
        {/* Frame Top Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-[#E8E1D2]">
          
          {/* Left: Terminal prompt + Headline + Hand-drawn note */}
          <div>
            <div className="font-mono text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
              <span>ssn@codingclub:~$</span>
              <span className="text-[#F43F5E] font-semibold">verticals</span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900">
                // OUR VERTICALS
              </h2>
            </div>

            {/* Hand-drawn arrow note */}
            <div className="mt-2 flex items-center gap-2 rotate-[-1deg]">
              <svg
                className="w-10 h-7 text-stone-600 -rotate-12"
                viewBox="0 0 50 35"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M 5 28 C 15 10, 35 12, 42 22" />
                <path d="M 33 22 L 42 22 L 40 13" />
              </svg>
              <span className="font-handwriting text-xl sm:text-2xl text-stone-700 font-bold">
                Same community, different interests.
              </span>
            </div>
          </div>

          {/* Right: Badge & Description */}
          <div className="max-w-md text-left md:text-right">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-stone-700 bg-stone-100/90 border border-stone-200/80 px-3 py-1 rounded-md">
              <span>[ 10 verticals ]</span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
              Ten engineering verticals, each with its own focus, projects, events and a space to grow.
            </p>

            {/* View Switcher Toggle */}
            <div className="mt-4 flex md:justify-end gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setViewMode("tabs")}
                className={`px-3 py-1 rounded border transition ${
                  viewMode === "tabs"
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                sticky tabs view
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded border transition ${
                  viewMode === "grid"
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                all 10 grid
              </button>
            </div>
          </div>
        </div>

        {/* ================= TAB BAR VIEW ================= */}
        {viewMode === "tabs" && (
          <div className="mt-8 space-y-8">
            
            {/* STICKY NOTE TAB STRIP */}
            <div className="relative pt-4 pb-2">
              <div className="flex gap-2.5 overflow-x-auto pb-4 pt-4 scrollbar-none items-end">
                {verticals.map((v, idx) => {
                  const color = STICKY_COLORS[idx % STICKY_COLORS.length];
                  const isSelected = selectedIndex === idx;

                  return (
                    <button
                      key={v.slug}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`group relative shrink-0 text-left transition-all duration-200 rounded-t-xl px-4 pt-5 pb-3 border ${
                        color.bg
                      } ${color.border} ${
                        isSelected
                          ? "shadow-lg -translate-y-2.5 z-20 scale-105 ring-2 ring-stone-900/10"
                          : "shadow-xs hover:-translate-y-1 z-10 opacity-80 hover:opacity-100"
                      }`}
                      style={{ width: "128px" }}
                    >
                      {/* Scotch Tape Sticker */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-11 h-4 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-2deg]" />

                      {/* Number badge */}
                      <div className="font-mono text-xs font-bold opacity-60">
                        {String(idx + 1).padStart(2, "0")}
                      </div>

                      {/* Title */}
                      <div className={`mt-1 font-bold text-xs truncate ${color.text}`}>
                        {v.name}
                      </div>

                      {/* Indicator pill */}
                      {isSelected && (
                        <div className="mt-2 h-1 w-full rounded-full bg-stone-900/60" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EXPANDED ACTIVE VERTICAL DOSSIER CARD */}
            {activeVertical && (
              <div className={`rounded-2xl border-2 ${activeColor.border} ${activeColor.bg} p-6 sm:p-9 shadow-md transition-all duration-300 relative`}>
                
                {/* Scotch tape on top right corner */}
                <div className="absolute -top-3 right-8 w-16 h-5 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[3deg]" />

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                  
                  {/* Left Column: Info, Tagline, Description */}
                  <div className="max-w-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-stone-900 text-white">
                        VERTICAL #{String(selectedIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-xs text-stone-500">
                        slug: /{activeVertical.slug}
                      </span>
                    </div>

                    <h3 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                      {activeVertical.name}
                    </h3>

                    <p className="text-base sm:text-lg font-medium text-stone-700">
                      &ldquo;{activeVertical.tagline}&rdquo;
                    </p>

                    <p className="text-sm sm:text-base leading-relaxed text-stone-600">
                      {activeVertical.description}
                    </p>

                    {/* Tech Stack topics */}
                    {activeVertical.topics && activeVertical.topics.length > 0 && (
                      <div className="pt-2">
                        <div className="font-mono text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                          Core Topics &amp; Tooling:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeVertical.topics.map((topic) => (
                            <span
                              key={topic}
                              className="rounded-lg bg-white/90 border border-stone-300/60 px-3 py-1 font-mono text-xs font-medium text-stone-800 shadow-2xs"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Lead Card + Action CTAs */}
                  <div className="flex flex-col justify-between gap-6 lg:w-80 shrink-0">
                    
                    {/* Vertical Head Card */}
                    <div className="rounded-xl border border-stone-300/80 bg-white/90 p-5 shadow-sm">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Vertical Lead
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-stone-900 text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs">
                          {activeVertical.lead.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 text-sm">
                            {activeVertical.lead.name}
                          </div>
                          <div className="text-xs text-stone-500">
                            {activeVertical.lead.role}
                          </div>
                        </div>
                      </div>

                      {activeVertical.lead.github && (
                        <div className="mt-3 pt-3 border-t border-stone-200 font-mono text-xs text-stone-600 flex items-center justify-between">
                          <span>GitHub:</span>
                          <a
                            href={`https://github.com/${activeVertical.lead.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-stone-900 hover:text-[#F43F5E] transition"
                          >
                            @{activeVertical.lead.github} ↗
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Navigation Actions */}
                    <div className="space-y-2.5">
                      <Link
                        href={`/verticals/${activeVertical.slug}`}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-mono text-xs font-bold py-3.5 px-4 shadow-md transition"
                      >
                        <span>Visit {activeVertical.name} Hub</span>
                        <span>&rarr;</span>
                      </Link>

                      <a
                        href="https://ssn-coding-club-cms.vercel.app/admin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-mono text-xs font-semibold py-2.5 px-4 transition"
                      >
                        <span>Write for {activeVertical.name}</span>
                        <span className="text-stone-400">(/admin) ↗</span>
                      </a>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ================= ALL 10 GRID VIEW ================= */}
        {viewMode === "grid" && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {verticals.map((v, idx) => {
              const color = STICKY_COLORS[idx % STICKY_COLORS.length];

              return (
                <Link
                  key={v.slug}
                  href={`/verticals/${v.slug}`}
                  className={`group relative flex flex-col justify-between rounded-2xl border ${
                    color.border
                  } ${color.bg} p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1`}
                >
                  {/* Scotch tape on top */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/80 border border-stone-400/20 shadow-2xs backdrop-blur-2xs rounded-xs pointer-events-none rotate-[-1.5deg]" />

                  <div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-stone-700">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-stone-500">
                        Lead: {v.lead.name}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-bold tracking-tight text-stone-900 group-hover:text-[#F43F5E] transition-colors">
                      {v.name}
                    </h3>

                    <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed line-clamp-3">
                      {v.tagline}
                    </p>

                    {v.topics && v.topics.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {v.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="rounded bg-white/90 border border-stone-300/40 px-2 py-0.5 font-mono text-[11px] text-stone-700"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-stone-300/60 pt-4 font-mono text-xs font-bold text-stone-900 group-hover:text-[#F43F5E] transition-colors">
                    <span>Explore vertical hub</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
