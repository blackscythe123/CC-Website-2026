"use client";

import { useState } from "react";
import Link from "next/link";
import SearchModal from "./SearchModal";
import type { VerticalMetadata } from "@/lib/verticals";

interface NavbarProps {
  verticals?: VerticalMetadata[];
  posts?: Array<{
    title: string;
    vertical: string;
    slug: string;
    summary?: string;
    date: string;
  }>;
}

export default function Navbar({ verticals = [], posts = [] }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navLinks = [
    { num: "01", label: "home", href: "/" },
    { num: "02", label: "verticals", href: "/#verticals" },
    { num: "03", label: "events", href: "/#events" },
    { num: "04", label: "blogs", href: "/blog" },
    { num: "05", label: "projects", href: "/#projects" },
    { num: "06", label: "people", href: "/#people" },
    { num: "07", label: "about", href: "/#about" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#121214]/95 backdrop-blur-md text-zinc-300">
        <div className="mx-auto flex h-13 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 font-mono text-xs">
          
          {/* Left: Mac window dots + Terminal prompt */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#EF4444] shadow-inner" />
              <span className="h-3 w-3 rounded-full bg-[#F59E0B] shadow-inner" />
              <span className="h-3 w-3 rounded-full bg-[#10B981] shadow-inner" />
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition font-medium tracking-tight ml-1"
            >
              <span>ssn@codingclub:~</span>
            </Link>
          </div>

          {/* Center: Numbered Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-1 rounded px-2.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition"
              >
                <span className="text-zinc-500 group-hover:text-[#F43F5E] transition-colors">
                  {link.num}.
                </span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Search & Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search verticals and articles"
              className="flex items-center justify-center h-8 w-8 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Join Us Button matching mockup */}
            <a
              href="https://ssn-coding-club-cms.vercel.app/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-zinc-200 hover:border-zinc-500 hover:text-white hover:bg-zinc-800 transition inline-flex items-center gap-1 shadow-2xs"
            >
              <span>join us</span>
              <span className="text-zinc-400">↗</span>
            </a>

            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-zinc-400 hover:text-white rounded"
              aria-label="Toggle navigation"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-800 bg-[#121214] px-4 py-3 space-y-1 font-mono text-xs">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <span>{link.label}</span>
                <span className="text-zinc-500">{link.num}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <a
                href="https://ssn-coding-club-cms.vercel.app/admin"
                className="text-[#F43F5E] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CMS Studio (/admin) ↗
              </a>
              <a
                href="https://github.com/blackscythe123/CC-Website-2026"
                className="text-zinc-400 hover:text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        verticals={verticals}
        posts={posts}
      />
    </>
  );
}
