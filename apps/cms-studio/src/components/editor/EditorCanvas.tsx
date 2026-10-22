"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Bold, Code, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, Minus, Quote, UploadCloud, X } from "lucide-react";
import type { UserRoleInfo } from "@/lib/roles";
import type { UserProfile } from "@/lib/hooks/useStudioSession";
import { applyCode, applyInline, applyLinePrefix, insertBlock, type EditResult } from "@/lib/markdownEditing";
import { verticalLabel } from "@/lib/verticals";
import { Avatar, Badge, IconButton, Spinner } from "@/components/ui";
import { roleLabel } from "@/components/shell/AccountMenu";

type Transform = (text: string, start: number, end: number) => EditResult;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const FORMATS: { id: string; label: string; icon: typeof Bold; shortcut?: string; run: Transform; group: 1 | 2 }[] = [
  { id: "bold", label: "Bold", icon: Bold, shortcut: "B", run: (t, s, e) => applyInline(t, s, e, "bold"), group: 1 },
  { id: "italic", label: "Italic", icon: Italic, shortcut: "I", run: (t, s, e) => applyInline(t, s, e, "italic"), group: 1 },
  { id: "link", label: "Link", icon: Link2, shortcut: "K", run: (t, s, e) => applyInline(t, s, e, "link"), group: 1 },
  { id: "h2", label: "Heading", icon: Heading2, run: (t, s, e) => applyLinePrefix(t, s, e, "h2"), group: 2 },
  { id: "h3", label: "Subheading", icon: Heading3, run: (t, s, e) => applyLinePrefix(t, s, e, "h3"), group: 2 },
  { id: "quote", label: "Quote", icon: Quote, run: (t, s, e) => applyLinePrefix(t, s, e, "quote"), group: 2 },
  { id: "code", label: "Code", icon: Code, run: applyCode, group: 2 },
  { id: "list", label: "Bulleted list", icon: List, run: (t, s, e) => applyLinePrefix(t, s, e, "list"), group: 2 },
  { id: "divider", label: "Divider", icon: Minus, run: (t, s, e) => insertBlock(t, s, e, "\n\n---\n\n"), group: 2 },
];

function firstImageFile(list: DataTransferItemList | FileList | null | undefined): File | null {
  if (!list) return null;
  for (const item of Array.from(list as ArrayLike<DataTransferItem | File>)) {
    const file = item instanceof File ? item : item.kind === "file" ? item.getAsFile() : null;
    if (file && file.type.startsWith("image/")) return file;
  }
  return null;
}

interface EditorCanvasProps {
  user: UserProfile;
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
  /** Validates + caches an image; rejects with a user-facing message */
  addImage: (file: File) => Promise<string>;
  onError: (message: string) => void;
  onSync: () => void;
  onOpenPublish: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export default function EditorCanvas(props: EditorCanvasProps) {
  const { user, roleInfo, selectedVertical, title, onTitleChange, content, onContentChange, coverImage, onCoverImageChange, textareaRef } = props;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);

  // Grow the body with its text, and restore the caret / selection after a programmatic edit.
  useEffect(() => {
    const sel = pendingSelection.current;
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, window.innerHeight * 0.55)}px`;
    }
    if (sel && el) {
      el.focus();
      el.setSelectionRange(sel.start, sel.end);
      pendingSelection.current = null;
    }
  }, [content, textareaRef]);

  // Grow the title field with its text.
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  const apply = (run: Transform) => {
    const el = textareaRef.current;
    if (!el) return;
    const result = run(el.value, el.selectionStart, el.selectionEnd);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
    onContentChange(result.text);
  };

  const insertImage = async (file: File) => {
    try {
      const url = await props.addImage(file);
      const alt = file.name.replace(/\.[^/.]+$/, "") || "image";
      apply((t, s, e) => insertBlock(t, s, e, `\n\n![${alt}](${url})\n\n`));
    } catch (err) {
      props.onError(err instanceof Error ? err.message : "Couldn't add that image.");
    }
  };

  const setCover = async (file: File) => {
    try {
      onCoverImageChange(await props.addImage(file));
    } catch (err) {
      props.onError(err instanceof Error ? err.message : "Couldn't add that image.");
    }
  };

  const onShortcut = (e: React.KeyboardEvent, inBody: boolean) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "s") {
      e.preventDefault();
      props.onSync();
    } else if (key === "enter") {
      e.preventDefault();
      props.onOpenPublish();
    } else if (inBody) {
      const fmt = FORMATS.find((f) => f.shortcut?.toLowerCase() === key);
      if (fmt) {
        e.preventDefault();
        apply(fmt.run);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Cover image */}
      {coverImage ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt="Cover" className="h-56 w-full object-cover sm:h-72" />
          <IconButton
            icon={X}
            label="Remove cover image"
            onClick={() => onCoverImageChange("")}
            className="absolute right-3 top-3 bg-bg/90 shadow-card backdrop-blur"
          />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Add a cover image: click, drop or paste an image"
          onClick={() => coverInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              coverInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setCoverDragOver(true);
          }}
          onDragLeave={() => setCoverDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setCoverDragOver(false);
            const file = firstImageFile(e.dataTransfer.files);
            if (file) setCover(file);
          }}
          onPaste={(e) => {
            const file = firstImageFile(e.clipboardData.items);
            if (file) {
              e.preventDefault();
              setCover(file);
            }
          }}
          className={`flex h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center text-[13px] transition ${
            coverDragOver ? "border-accent bg-accent-soft text-accent-strong" : "border-border-strong text-muted hover:border-accent hover:text-text"
          }`}
        >
          {props.uploadingImage ? <Spinner size={16} /> : <UploadCloud className="h-5 w-5 shrink-0" aria-hidden />}
          <span>
            <span className="font-semibold text-text">Add a cover image</span>
            <span className="hidden sm:inline"> — click, drop or paste</span>
          </span>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setCover(file);
            }}
          />
        </div>
      )}

      {/* Title */}
      <textarea
        ref={titleRef}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            textareaRef.current?.focus();
            return;
          }
          onShortcut(e, false);
        }}
        placeholder="Title"
        aria-label="Article title"
        rows={1}
        className="w-full resize-none overflow-hidden border-none bg-transparent text-3xl font-extrabold leading-tight tracking-tight text-text placeholder:text-subtle focus:outline-none focus-visible:outline-none sm:text-[2.6rem]"
      />

      {/* Byline */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-border py-3 text-[13px]">
        <Avatar src={user.avatar_url} login={user.login} size={30} />
        <span className="font-semibold">{user.name || user.login}</span>
        <span className="text-muted">@{user.login}</span>
        <Badge tone="info">{verticalLabel(selectedVertical)}</Badge>
        <span className="hidden text-muted sm:inline">{roleLabel(roleInfo)}</span>
        <span className="ml-auto tabular-nums text-muted">
          {props.wordCount} words · {props.readingTime} min read
        </span>
      </div>

      {/* Formatting bar */}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="z-20 flex items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-bg/95 p-1 shadow-card backdrop-blur [scrollbar-width:none] md:sticky md:top-[var(--editor-toolbar-h,3.5rem)] [&::-webkit-scrollbar]:hidden"
      >
        {FORMATS.map((f, i) => {
          const Icon = f.icon;
          const title = f.shortcut ? `${f.label} (${MOD}+${f.shortcut})` : f.label;
          return (
            <span key={f.id} className="flex items-center">
              {i > 0 && FORMATS[i - 1].group !== f.group ? <span className="mx-1 h-5 w-px bg-border" aria-hidden /> : null}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(f.run)}
                aria-label={title}
                title={title}
                className="flex h-8 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text sm:w-8"
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            </span>
          );
        })}
        <span className="flex-1" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => imageInputRef.current?.click()}
          disabled={props.uploadingImage}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
          title="Insert an image (or paste / drop one into the text)"
          aria-label="Insert image"
        >
          {props.uploadingImage ? <Spinner size={14} /> : <ImageIcon className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">Image</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) insertImage(file);
          }}
        />
      </div>

      {/* Body (Markdown) */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={(e) => onShortcut(e, true)}
        onDrop={(e) => {
          const file = firstImageFile(e.dataTransfer.files);
          if (file) {
            e.preventDefault();
            insertImage(file);
          }
        }}
        onPaste={(e) => {
          const file = firstImageFile(e.clipboardData.items);
          if (file) {
            e.preventDefault();
            insertImage(file);
          }
        }}
        aria-label="Article body (Markdown)"
        placeholder="Tell your story… Markdown works. Paste or drop images anywhere."
        className="min-h-[55vh] w-full resize-none overflow-hidden border-none bg-transparent font-mono text-[15px] leading-[1.8] text-text placeholder:text-subtle focus:outline-none focus-visible:outline-none"
      />
    </div>
  );
}
