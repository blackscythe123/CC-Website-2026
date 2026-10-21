"use client";

import type { RefObject } from "react";
import { Code, Heading2, Heading3, Image as ImageIcon, List, Minus, Quote, UploadCloud, X } from "lucide-react";
import type { UserRoleInfo } from "@/lib/roles";
import type { UserProfile } from "@/lib/hooks/useStudioSession";
import { verticalLabel } from "@/lib/verticals";

const FORMAT_ACTIONS = [
  { label: "H2", title: "Heading 2", icon: Heading2, snippet: "\n\n## Section Heading\n\n" },
  { label: "H3", title: "Heading 3", icon: Heading3, snippet: "\n\n### Subheading\n\n" },
  { label: "Quote", title: "Quote", icon: Quote, snippet: "\n\n> Medium-style memorable pull-quote...\n\n" },
  { label: "Code", title: "Code Block", icon: Code, snippet: "\n\n```typescript\n// Your code snippet here\n```\n\n" },
  { label: "List", title: "Bulleted List", icon: List, snippet: "\n\n- Item 1\n- Item 2\n- Item 3\n\n" },
  { label: "Divider", title: "Divider", icon: Minus, snippet: "\n\n---\n\n" },
];

interface EditorCanvasProps {
  user: UserProfile | null;
  roleInfo: UserRoleInfo | null;
  selectedVertical: string;
  title: string;
  onTitleChange: (value: string) => void;
  content: string;
  onContentChange: (value: string) => void;
  coverImage: string;
  onCoverImageChange: (url: string) => void;
  wordCount: number;
  readingTime: number;
  uploadingImage: boolean;
  onImageUpload: (file: File) => Promise<string | null>;
  onInsert: (text: string) => void;
  onDrop: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export default function EditorCanvas({
  user,
  roleInfo,
  selectedVertical,
  title,
  onTitleChange,
  content,
  onContentChange,
  coverImage,
  onCoverImageChange,
  wordCount,
  readingTime,
  uploadingImage,
  onImageUpload,
  onInsert,
  onDrop,
  textareaRef,
}: EditorCanvasProps) {
  return (
    <div className="space-y-6">
      {/* Cover Image Selector */}
      <div>
        {coverImage ? (
          <div className="relative group overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <img
              src={coverImage}
              alt="Cover"
              className="h-64 w-full object-cover sm:h-80 transition"
            />
            <button
              onClick={() => onCoverImageChange("")}
              className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black transition"
              title="Remove cover"
              aria-label="Remove cover image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-400 transition">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <UploadCloud className="h-5 w-5 text-gray-400" />
              <span>Add a cover banner image (drag &amp; drop or click to upload)</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const url = await onImageUpload(e.target.files[0]);
                  if (url) onCoverImageChange(url);
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Title (Big Medium-style Headline) */}
      <textarea
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Title"
        aria-label="Article title"
        rows={1}
        className="w-full resize-none border-none text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 placeholder-gray-300 focus:outline-hidden focus:ring-0 leading-tight"
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = "auto";
          target.style.height = target.scrollHeight + "px";
        }}
      />

      {/* Author Byline Card (Medium-Style in Write Canvas) */}
      {user && (
        <div className="flex items-center justify-between border-y border-gray-100 py-3 my-2 text-xs">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar_url}
              alt={user.name || user.login}
              className="h-9 w-9 rounded-full ring-2 ring-gray-100 object-cover shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{user.name || user.login}</span>
                <span className="text-[11px] font-mono text-gray-400">@{user.login}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 capitalize">
                  {roleInfo?.role.replace("_", " ") || "Author"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                <span>Targeting:</span>
                <span className="font-medium text-gray-700">{verticalLabel(selectedVertical)}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-gray-400 font-mono text-[11px]">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{readingTime} min read</span>
          </div>
        </div>
      )}

      {/* Floating Formatting Toolbar */}
      <div className="sticky top-28 z-30 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-md">
        {FORMAT_ACTIONS.map(({ label, title: actionTitle, icon: Icon, snippet }) => (
          <button
            key={label}
            onClick={() => onInsert(snippet)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
            title={actionTitle}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}

        <label className="flex items-center gap-1 cursor-pointer rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition ml-auto">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>{uploadingImage ? "Processing..." : "Insert Mid-Post Image"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingImage}
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                const file = e.target.files[0];
                const url = await onImageUpload(file);
                if (url) {
                  onInsert(`\n\n![${file.name}](${url})\n\n`);
                }
              }
            }}
          />
        </label>
      </div>

      {/* Medium-style Body Canvas Area */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onDrop={onDrop}
        aria-label="Article body (Markdown)"
        placeholder="Tell your story... Drag and drop images anywhere mid-article, or click 'Insert Mid-Post Image'..."
        className="min-h-[500px] w-full resize-none border-none text-lg leading-relaxed text-gray-800 placeholder-gray-300 focus:outline-hidden focus:ring-0"
      />
    </div>
  );
}
