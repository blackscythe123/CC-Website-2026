"use client";

import Link from "next/link";
import { useState } from "react";

export default function HeroDesk() {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  const commands = [
    { cmd: "verticals_", desc: "explore our 10 engineering verticals", href: "#verticals" },
    { cmd: "events_", desc: "view upcoming workshops & hackathons", href: "#events" },
    { cmd: "blogs_", desc: "read our latest cross-vertical articles", href: "/blog" },
    { cmd: "projects_", desc: "check out our open-source projects", href: "#projects" },
    { cmd: "people_", desc: "meet our 10 vertical heads & core team", href: "#people" },
    { cmd: "about_", desc: "know more about our Git CMS workflow", href: "#about" },
  ];

  return (
    <section className="relative retro-desk-bg overflow-hidden pt-8 pb-16 lg:py-16">
      {/* Outer Desk Container */}
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8 relative">
        <div className="relative flex flex-col items-center justify-center">

          {/* DESK ARRANGEMENT (Accessories + Central Laptop) */}
          <div className="relative w-full flex items-center justify-center">

            {/* ================= LEFT DESK ITEMS ================= */}
            <div className="hidden xl:flex absolute left-2 top-4 bottom-12 flex-col justify-between items-start w-52 z-10 pointer-events-auto select-none">
              
              {/* Taped SSN Coding Club Logo Card */}
              <div className="relative rotate-[-4deg] transition-transform hover:rotate-0 duration-300">
                {/* Scotch tape */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/75 border border-amber-900/10 shadow-2xs backdrop-blur-xs rounded-xs z-20" />
                
                <div className="bg-[#FFFDF8] border border-[#E8E1D2] rounded-xl p-4 shadow-md w-44 text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-500 flex items-center justify-center shadow-inner">
                    <span className="font-mono text-white text-lg font-black tracking-tighter">
                      &lt;||&gt;
                    </span>
                  </div>
                  <div className="mt-2.5 font-extrabold text-base tracking-tight text-stone-900">
                    SSN
                  </div>
                  <div className="font-mono text-[10px] uppercase font-bold tracking-widest text-stone-500">
                    CODING CLUB
                  </div>
                </div>
              </div>

              {/* Hand-drawn note with arrow pointing to laptop */}
              <div className="relative pl-2 my-2 rotate-[-2deg]">
                <div className="font-handwriting text-2xl text-stone-700 leading-tight">
                  workshops,<br />talks,<br />projects<br />and more...
                </div>
                {/* Curved Arrow SVG */}
                <svg
                  className="w-16 h-12 text-stone-700 mt-1 ml-4"
                  viewBox="0 0 70 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M 10 5 C 10 35, 45 40, 60 25" />
                  <path d="M 52 20 L 60 25 L 56 34" />
                </svg>
              </div>

              {/* Stack of Colorful Books (IDEAS, LEARN, BUILD, SHARE, GROW) */}
              <div className="relative space-y-1 w-44">
                {/* Book 1: IDEAS (Pink/Coral) */}
                <div className="h-6.5 rounded-l-md rounded-r-xs bg-[#F43F5E] shadow-sm flex items-center justify-between px-3 border-r-4 border-r-[#FFF7ED] text-white font-mono text-[10px] font-bold tracking-wider">
                  <span>IDEAS</span>
                  <span className="opacity-60 text-[8px]">●</span>
                </div>
                {/* Book 2: LEARN (Sky Blue) */}
                <div className="h-6.5 rounded-l-md rounded-r-xs bg-[#0284C7] shadow-sm flex items-center justify-between px-3 border-r-4 border-r-[#FFF7ED] text-white font-mono text-[10px] font-bold tracking-wider">
                  <span>LEARN</span>
                  <span className="opacity-60 text-[8px]">●</span>
                </div>
                {/* Book 3: BUILD (Amber Gold) */}
                <div className="h-6.5 rounded-l-md rounded-r-xs bg-[#F59E0B] shadow-sm flex items-center justify-between px-3 border-r-4 border-r-[#FFF7ED] text-stone-900 font-mono text-[10px] font-bold tracking-wider">
                  <span>BUILD</span>
                  <span className="opacity-60 text-[8px]">●</span>
                </div>
                {/* Book 4: SHARE (Emerald Green) */}
                <div className="h-6.5 rounded-l-md rounded-r-xs bg-[#10B981] shadow-sm flex items-center justify-between px-3 border-r-4 border-r-[#FFF7ED] text-white font-mono text-[10px] font-bold tracking-wider">
                  <span>SHARE</span>
                  <span className="opacity-60 text-[8px]">●</span>
                </div>
                {/* Book 5: GROW (Purple) */}
                <div className="h-7.5 rounded-l-md rounded-r-xs bg-[#8B5CF6] shadow-md flex items-center justify-between px-3 border-r-4 border-r-[#FFF7ED] text-white font-mono text-[10px] font-bold tracking-wider">
                  <span>GROW</span>
                  <span className="opacity-60 text-[8px]">●</span>
                </div>

                {/* Cup with Pencils */}
                <div className="pt-2 flex items-end pl-2">
                  <div className="relative w-12 h-14 bg-amber-100/90 border border-amber-300 rounded-b-lg shadow-sm flex items-center justify-center">
                    {/* Pencil sticks */}
                    <div className="absolute -top-7 left-2 w-1.5 h-10 bg-rose-500 rounded-t-sm -rotate-12" />
                    <div className="absolute -top-8 left-5 w-1.5 h-11 bg-stone-700 rounded-t-sm rotate-3" />
                    <div className="absolute -top-6 left-8 w-1.5 h-9 bg-blue-500 rounded-t-sm rotate-12" />
                    <span className="font-mono text-[9px] text-amber-800 font-bold opacity-70">CC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= CENTER LAPTOP ================= */}
            <div className="relative w-full max-w-[890px] mx-auto z-20">
              
              {/* Laptop Screen Bezel */}
              <div className="relative rounded-t-2xl sm:rounded-t-3xl border-[6px] sm:border-[10px] border-[#18202F] bg-[#18202F] shadow-2xl overflow-hidden">
                
                {/* Webcam dot at top */}
                <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0F141E] border border-stone-700 flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-blue-400 opacity-60" />
                  </div>
                </div>

                {/* Inside Laptop Display (Warm Cream Canvas) */}
                <div className="relative bg-[#FAF7EE] text-stone-900 p-4 sm:p-7 md:p-9 min-h-[440px] sm:min-h-[500px] flex flex-col justify-between">
                  
                  {/* Decorative Hand-drawn Desk Sketch (Top Right of Laptop) */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-7 hidden md:block w-48 sm:w-56 pointer-events-none select-none text-stone-800">
                    <svg
                      viewBox="0 0 200 150"
                      className="w-full h-auto opacity-80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Hanging Pendant Lamp */}
                      <line x1="80" y1="0" x2="80" y2="28" />
                      <polygon points="65,42 95,42 88,28 72,28" />
                      {/* Light bulb glow cone */}
                      <circle cx="80" cy="45" r="2" fill="#F59E0B" />
                      
                      {/* Shelf with Books */}
                      <line x1="105" y1="46" x2="185" y2="46" strokeWidth="2.2" />
                      {/* Books on shelf */}
                      <rect x="115" y="28" width="6" height="18" fill="#F43F5E" stroke="#1F2937" />
                      <rect x="123" y="30" width="7" height="16" fill="#3B82F6" stroke="#1F2937" />
                      <rect x="132" y="26" width="6" height="20" fill="#F59E0B" stroke="#1F2937" />
                      {/* Potted succulent on shelf */}
                      <polygon points="160,46 172,46 170,38 162,38" fill="#FEF3C7" />
                      <path d="M 166 38 C 166 32, 169 32, 169 35 C 169 32, 172 34, 170 38" stroke="#10B981" fill="#D1FAE5" />

                      {/* Small sticky notes on wall */}
                      <rect x="160" y="8" width="12" height="12" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.8" transform="rotate(-6 160 8)" />
                      <rect x="178" y="16" width="10" height="10" fill="#FECDD3" stroke="#F43F5E" strokeWidth="0.8" transform="rotate(4 178 16)" />

                      {/* Monitor <//> on desk */}
                      <rect x="95" y="80" width="70" height="46" rx="4" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
                      <rect x="99" y="84" width="62" height="38" rx="2" fill="#FDFBF7" stroke="#E5E7EB" strokeWidth="0.8" />
                      <text x="130" y="107" textAnchor="middle" fontFamily="monospace" fontSize="13" fontWeight="bold" fill="#F43F5E">&lt;/&gt;</text>
                      <path d="M 124 126 L 136 126 L 134 133 L 126 133 Z" fill="#1F2937" />
                      <line x1="116" y1="133" x2="144" y2="133" strokeWidth="2" />

                      {/* Plant beside monitor */}
                      <polygon points="172,133 182,133 180,121 174,121" fill="#FEF3C7" />
                      <path d="M 177 121 C 174 114, 177 110, 177 110 C 177 110, 180 114, 177 121" stroke="#10B981" />
                      <path d="M 177 118 C 182 115, 183 118, 178 121" stroke="#10B981" />

                      {/* Pink doodle sparkle rays */}
                      <path d="M 40 35 L 35 30 M 46 28 L 46 22 M 52 35 L 57 30" stroke="#F43F5E" strokeWidth="1.8" />
                    </svg>
                  </div>

                  {/* Main Screen Content */}
                  <div className="space-y-4 sm:space-y-5 max-w-xl">
                    
                    {/* Terminal Welcome Prompt */}
                    <div className="font-mono text-xs sm:text-sm text-stone-700 flex items-center gap-1.5">
                      <span>ssn@codingclub:~$</span>
                      <span className="text-[#F43F5E] font-semibold">welcome</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 leading-[1.12]">
                      A community<br />
                      for curious minds<br />
                      <span className="text-[#F43F5E] inline-flex items-center">
                        who build.
                        <span className="inline-block w-2.5 sm:w-3.5 h-6 sm:h-8 bg-[#F43F5E] ml-1 animate-cursor" />
                      </span>
                    </h1>

                    {/* Subtext */}
                    <p className="text-stone-700 text-xs sm:text-sm md:text-base leading-relaxed max-w-lg font-normal">
                      SSN Coding Club is a space to explore technology in all its forms &mdash; through workshops, projects, blogs and a community that learns and builds together.
                    </p>

                    {/* Interactive Command Exploration Box */}
                    <div className="mt-3 rounded-xl border border-stone-800/30 bg-[#F4EFE6]/70 p-3 sm:p-4 font-mono text-xs shadow-xs backdrop-blur-2xs">
                      <div className="text-[11px] text-stone-600 font-semibold mb-2 flex items-center justify-between">
                        <span>Type a command to explore:</span>
                        <span className="text-[10px] text-stone-400">click to jump</span>
                      </div>

                      <div className="space-y-1.5">
                        {commands.map((c) => (
                          <a
                            key={c.cmd}
                            href={c.href}
                            onMouseEnter={() => setActiveCommand(c.cmd)}
                            onMouseLeave={() => setActiveCommand(null)}
                            className="group flex flex-wrap items-baseline gap-2 rounded px-1.5 py-0.5 hover:bg-white/80 transition"
                          >
                            <span className="text-[#F43F5E] font-bold group-hover:translate-x-0.5 transition-transform">
                              &gt; {c.cmd}
                            </span>
                            <span className="text-stone-600 text-[11px] sm:text-xs">
                              - {c.desc}
                            </span>
                          </a>
                        ))}
                      </div>

                      {/* Blinking Prompt Line */}
                      <div className="mt-3 pt-2 border-t border-stone-300 flex items-center gap-1.5 text-stone-800 text-xs">
                        <span>ssn@codingclub:~$</span>
                        <span className="text-[#F43F5E] font-semibold">{activeCommand || ""}</span>
                        <span className="inline-block w-2 h-3.5 bg-[#F43F5E] animate-cursor" />
                      </div>
                    </div>
                  </div>

                  {/* Pink Dashed Sticky Quote Badge (Bottom Right of Screen) */}
                  <div className="mt-4 self-end sm:absolute sm:bottom-6 sm:right-7">
                    <div className="relative rounded-xl border-2 border-dashed border-[#F43F5E]/70 bg-[#FFF3F4]/90 p-3 sm:p-4 text-stone-900 shadow-xs max-w-[210px]">
                      {/* Pink corner doodle sparks */}
                      <div className="absolute -top-3 -right-2 font-handwriting text-rose-500 text-xs">
                        \ | /
                      </div>
                      <div className="font-mono text-xs sm:text-sm font-bold text-stone-800 leading-snug">
                        &ldquo;learn<br />
                        &nbsp;build<br />
                        &nbsp;collaborate<br />
                        &nbsp;<span className="text-[#F43F5E]">repeat._</span>&rdquo;
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Laptop Keyboard Base & Hinge */}
              <div className="relative mx-auto w-[102%] -left-[1%]">
                {/* Metallic Hinge & Top Edge */}
                <div className="h-2.5 sm:h-3.5 bg-[#1F293D] rounded-t-sm border-t border-slate-600/40 shadow-inner" />
                
                {/* Tapered Laptop Base with Keyboard Texture */}
                <div className="relative bg-gradient-to-b from-[#18202F] via-[#141B28] to-[#0F141E] rounded-b-2xl sm:rounded-b-3xl px-6 sm:px-12 pt-2 pb-3 sm:pb-4 shadow-2xl border-t border-slate-700/30">
                  {/* Keyboard Key Grating Simulation */}
                  <div className="h-5 sm:h-7 mx-auto max-w-[70%] border border-slate-700/40 rounded-sm bg-[#101622]/60 flex items-center justify-center px-4">
                    <div className="w-full flex items-center justify-between opacity-30 text-[8px] font-mono text-slate-400">
                      <span>[ esc ]</span>
                      <span className="hidden sm:inline">[ f1 - f12 ]</span>
                      <span className="h-1 w-24 sm:w-36 rounded-full bg-slate-500/50" />
                      <span>[ enter ]</span>
                    </div>
                  </div>

                  {/* Trackpad */}
                  <div className="mx-auto mt-1 sm:mt-1.5 w-24 sm:w-36 h-3 sm:h-4 rounded-sm border border-slate-700/50 bg-[#161F2E]/70 shadow-inner" />
                </div>
              </div>

              {/* Scroll Down Arrow Indicator */}
              <div className="mt-6 flex justify-center">
                <a
                  href="#verticals"
                  aria-label="Scroll down to Verticals"
                  className="group flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/90 border border-[#E8E1D2] text-[#F43F5E] shadow-md hover:bg-white hover:scale-105 transition"
                >
                  <svg
                    className="w-5 h-5 group-hover:translate-y-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </a>
              </div>

            </div>

            {/* ================= RIGHT DESK ITEMS ================= */}
            <div className="hidden xl:flex absolute right-2 top-4 bottom-12 flex-col justify-between items-end w-52 z-10 pointer-events-auto select-none">
              
              {/* Polaroid 1: Community Workshop */}
              <div className="relative rotate-[4deg] transition-transform hover:rotate-0 duration-300">
                {/* Scotch Tape */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/75 border border-amber-900/10 shadow-2xs backdrop-blur-xs rounded-xs z-20" />
                
                <div className="bg-white border border-[#E8E1D2] rounded-md p-2 pb-3 shadow-lg w-44">
                  {/* Photo area */}
                  <div className="relative h-28 w-full bg-gradient-to-br from-stone-900 via-rose-950 to-stone-950 rounded-xs overflow-hidden flex items-center justify-center">
                    {/* Audience Workshop Graphic */}
                    <div className="absolute inset-0 opacity-80 flex flex-col justify-end p-2 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-rose-600/10 to-transparent">
                      <div className="flex gap-1 justify-center items-end opacity-70">
                        <div className="w-2.5 h-6 bg-stone-700 rounded-t-full" />
                        <div className="w-3 h-8 bg-stone-600 rounded-t-full" />
                        <div className="w-2.5 h-7 bg-stone-700 rounded-t-full" />
                        <div className="w-3.5 h-9 bg-rose-900 rounded-t-full" />
                        <div className="w-2.5 h-6 bg-stone-700 rounded-t-full" />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-amber-200/80 font-bold tracking-widest uppercase">
                      SSN STAGE
                    </span>
                  </div>
                  {/* Handwritten Polaroid Caption */}
                  <div className="mt-2 text-center font-handwriting text-base text-stone-800 leading-tight">
                    same people<br />
                    new ideas. <span className="text-[#F43F5E]">♥</span>
                  </div>
                </div>
              </div>

              {/* Polaroid 2: Coder / Hacker */}
              <div className="relative rotate-[-3deg] transition-transform hover:rotate-0 duration-300">
                {/* Scotch Tape */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/75 border border-amber-900/10 shadow-2xs backdrop-blur-xs rounded-xs z-20" />
                
                <div className="bg-white border border-[#E8E1D2] rounded-md p-2 pb-3 shadow-lg w-44">
                  {/* Photo area */}
                  <div className="relative h-28 w-full bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 rounded-xs overflow-hidden flex items-center justify-center">
                    <div className="font-mono text-[10px] text-cyan-300/80 font-bold tracking-tight text-center px-2">
                      &gt; npx build<br />
                      <span className="text-emerald-400">✓ compiled</span>
                    </div>
                  </div>
                  {/* Handwritten Polaroid Caption */}
                  <div className="mt-2 text-center font-handwriting text-base text-stone-800 leading-tight">
                    different interests.<br />
                    shared curiosity. <span className="text-[#F43F5E]">♥</span>
                  </div>
                </div>
              </div>

              {/* Stack of Dark Minimalist Notebooks */}
              <div className="relative space-y-1 w-44">
                <div className="h-6 rounded-l-xs rounded-r-md bg-[#1C1917] shadow-sm flex items-center justify-between px-3 text-stone-300 font-mono text-[10px] font-bold tracking-wider">
                  <span>TECH</span>
                  <span className="text-stone-600 text-[8px]">CC</span>
                </div>
                <div className="h-6 rounded-l-xs rounded-r-md bg-[#292524] shadow-sm flex items-center justify-between px-3 text-stone-300 font-mono text-[10px] font-bold tracking-wider">
                  <span>PEOPLE</span>
                  <span className="text-stone-600 text-[8px]">CC</span>
                </div>
                <div className="h-6 rounded-l-xs rounded-r-md bg-[#1C1917] shadow-sm flex items-center justify-between px-3 text-stone-300 font-mono text-[10px] font-bold tracking-wider">
                  <span>IDEAS</span>
                  <span className="text-stone-600 text-[8px]">CC</span>
                </div>
                <div className="h-7 rounded-l-xs rounded-r-md bg-[#292524] shadow-md flex items-center justify-between px-3 text-stone-300 font-mono text-[10px] font-bold tracking-wider">
                  <span>COMMUNITY</span>
                  <span className="text-stone-600 text-[8px]">CC</span>
                </div>

                {/* Wireless Mouse */}
                <div className="pt-2 flex justify-end pr-3">
                  <div className="w-12 h-18 rounded-3xl bg-gradient-to-b from-stone-100 to-stone-200 border border-stone-300 shadow-md flex flex-col items-center pt-2">
                    <div className="w-1.5 h-4 bg-stone-400 rounded-full" />
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
