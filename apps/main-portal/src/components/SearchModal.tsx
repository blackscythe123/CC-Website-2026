"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { VerticalMetadata } from "@/lib/verticals";

interface SearchItem {
  type: "vertical" | "blog";
  title: string;
  subtitle: string;
  url: string;
  tag?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  verticals: VerticalMetadata[];
  posts: Array<{
    title: string;
    vertical: string;
    slug: string;
    summary?: string;
    date: string;
  }>;
}

export default function SearchModal({
  isOpen,
  onClose,
  verticals,
  posts,
}: SearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items: SearchItem[] = [
    ...verticals.map((v) => ({
      type: "vertical" as const,
      title: v.name,
      subtitle: v.tagline,
      url: `/verticals/${v.slug}`,
      tag: "Vertical",
    })),
    ...posts.map((p) => ({
      type: "blog" as const,
      title: p.title,
      subtitle: p.summary || `Published on ${p.date}`,
      url: `/blog/${p.vertical}/${p.slug}`,
      tag: p.vertical,
    })),
  ];

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.tag && item.tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl rounded-2xl border border-stone-800 bg-[#16161A] text-stone-200 shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal search topbar */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-[#121214]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
            <span className="h-3 w-3 rounded-full bg-[#F59E0B]" />
            <span className="h-3 w-3 rounded-full bg-[#10B981]" />
            <span className="text-xs text-zinc-400 ml-2">ssn@codingclub: search_</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-white px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
          >
            [esc]
          </button>
        </div>

        {/* Search input field */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3 bg-[#1A1A20]">
          <span className="text-[#F43F5E] text-sm mr-2">&gt;</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search verticals, articles, topics..."
            autoFocus
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-zinc-500 font-mono"
          />
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No matching results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.slice(0, 8).map((item) => (
              <Link
                key={item.url}
                href={item.url}
                onClick={onClose}
                className="group flex items-start justify-between rounded-lg p-3 hover:bg-zinc-800/70 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.type === "vertical"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-blue-950 text-blue-300 border border-blue-800"
                      }`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-sm font-semibold text-white group-hover:text-[#F43F5E] transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-1 font-sans">
                    {item.subtitle}
                  </p>
                </div>
                <span className="text-zinc-600 group-hover:text-white text-xs ml-4">
                  &rarr;
                </span>
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-500 flex justify-between bg-[#121214]">
          <span>Navigation: Up / Down</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
