"use client";

import type { UserProfile } from "@/lib/hooks/useStudioSession";
import { verticalLabel } from "@/lib/verticals";

interface ArticlePreviewProps {
  user: UserProfile | null;
  selectedVertical: string;
  title: string;
  coverImage: string;
  /** Already-sanitized HTML of the article body */
  html: string;
  wordCount: number;
  readingTime: number;
}

export default function ArticlePreview({
  user,
  selectedVertical,
  title,
  coverImage,
  html,
  wordCount,
  readingTime,
}: ArticlePreviewProps) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-10 shadow-sm transition">
      {/* Cover Image Banner */}
      {coverImage ? (
        <div className="mb-8 overflow-hidden rounded-2xl shadow-sm border border-gray-100">
          <img
            src={coverImage}
            alt={title || "Cover Image"}
            className="h-64 sm:h-96 w-full object-cover"
          />
        </div>
      ) : null}

      {/* Metadata Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4">
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">
          {verticalLabel(selectedVertical)}
        </span>
        <span>•</span>
        <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <span>•</span>
        <span className="font-medium text-gray-600">{readingTime} min read</span>
        <span>•</span>
        <span>{wordCount} words</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
        {title.trim() ? title : <span className="text-gray-300 italic">Untitled Article</span>}
      </h1>

      {/* Author Card */}
      {user && (
        <div className="flex items-center gap-3.5 border-y border-gray-100 py-4 my-6">
          <img
            src={user.avatar_url}
            alt={user.name || user.login}
            className="h-10 w-10 rounded-full ring-2 ring-gray-100"
          />
          <div>
            <div className="text-sm font-semibold text-gray-900">{user.name || user.login}</div>
            <div className="text-xs text-gray-500">
              @{user.login}
            </div>
          </div>
        </div>
      )}

      {/* Rendered Markdown Body */}
      <div
        className="article-preview text-gray-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
