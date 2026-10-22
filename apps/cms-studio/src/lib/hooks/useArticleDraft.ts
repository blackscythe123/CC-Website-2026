"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  base64ToBlobUrl,
  clearLocalDraft,
  getLocalDraft,
  saveLocalDraft,
  type PendingDraftImage,
  type StoredDraft,
} from "@/lib/draftStorage";
import type { SaveState } from "@/lib/saveStatus";

export interface DraftFields {
  title: string;
  content: string;
  coverImage: string;
  selectedVertical: string;
  summary: string;
  tags: string[];
  pendingImages: PendingDraftImage[];
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const AUTOSAVE_MS = 2000;

function emptyDraft(vertical: string): DraftFields {
  return { title: "", content: "", coverImage: "", selectedVertical: vertical, summary: "", tags: [], pendingImages: [] };
}

function hasAnyContent(d: DraftFields) {
  return Boolean(d.title.trim() || d.content.trim() || d.pendingImages.length > 0);
}

async function persist(d: DraftFields) {
  const cover = d.pendingImages.find((img) => img.placeholderUrl === d.coverImage);
  await saveLocalDraft({
    title: d.title,
    content: d.content,
    coverImage: d.coverImage,
    coverImageBase64: cover?.base64,
    coverImageMime: cover?.mimeType,
    selectedVertical: d.selectedVertical,
    summary: d.summary,
    tags: d.tags,
    pendingImages: d.pendingImages,
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * The article being written: fields, IndexedDB autosave (crash / power-loss recovery),
 * the save-status shown in the toolbar, recovery of an unsaved draft, and reset for "New post".
 */
export function useArticleDraft(initialVertical: string) {
  const [draft, setDraft] = useState<DraftFields>(() => emptyDraft(initialVertical));
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [recovered, setRecovered] = useState<StoredDraft | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepStatusOnNextSave = useRef(false);
  const latest = useRef(draft);
  latest.current = draft;

  const set = useCallback(<K extends keyof DraftFields>(key: K, value: DraftFields[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  // Offer to restore an unsaved draft left in this browser.
  useEffect(() => {
    getLocalDraft().then((stored) => {
      if (stored && (stored.title.trim() || stored.content.trim() || stored.pendingImages?.length)) {
        setRecovered(stored);
      }
    });
  }, []);

  // Debounced autosave to IndexedDB.
  useEffect(() => {
    if (!hasAnyContent(draft)) return;
    const quiet = keepStatusOnNextSave.current;
    keepStatusOnNextSave.current = false;
    if (!quiet) setSaveState({ kind: "saving" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
      try {
        await persist(latest.current);
        if (!quiet) setSaveState({ kind: "local", at: new Date() });
      } catch {
        setSaveState({ kind: "idle" });
      }
    }, AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft]);

  // Warn before leaving with work in the editor.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyContent(latest.current)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /** Save to this device right away (used before syncing to GitHub). */
  const saveNow = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await persist(latest.current);
    setSaveState({ kind: "local", at: new Date() });
  }, []);

  const markSynced = useCallback(() => setSaveState({ kind: "synced", at: new Date() }), []);

  const restoreRecovered = useCallback(() => {
    if (!recovered) return;
    let content = recovered.content || "";
    let cover = recovered.coverImage || "";

    // Blob URLs from the previous session are dead: rebuild them from the stored base64.
    const images = (recovered.pendingImages || []).map((img) => {
      const fresh = base64ToBlobUrl(img.base64, img.mimeType || "image/png");
      if (img.placeholderUrl) {
        content = content.replaceAll(img.placeholderUrl, fresh);
        if (cover === img.placeholderUrl) cover = fresh;
      }
      return { ...img, placeholderUrl: fresh };
    });
    if (cover.startsWith("blob:") && recovered.coverImageBase64) {
      cover = base64ToBlobUrl(recovered.coverImageBase64, recovered.coverImageMime || "image/png");
    }

    keepStatusOnNextSave.current = true;
    setDraft((d) => ({
      title: recovered.title || "",
      content,
      coverImage: cover,
      selectedVertical: recovered.selectedVertical || d.selectedVertical,
      summary: recovered.summary || "",
      tags: recovered.tags || [],
      pendingImages: images,
    }));
    setSaveState({ kind: "local", at: new Date(recovered.updatedAt) });
    setRecovered(null);
  }, [recovered]);

  const discardRecovered = useCallback(async () => {
    await clearLocalDraft();
    setRecovered(null);
  }, []);

  /** Start a brand-new post: clears the editor and this device's autosave. */
  const reset = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await clearLocalDraft();
    setDraft((d) => emptyDraft(d.selectedVertical));
    setSaveState({ kind: "idle" });
    setRecovered(null);
  }, []);

  /** Replace the editor with a draft loaded from GitHub (cloud draft or PR under revision). */
  const loadFrom = useCallback((fields: Partial<DraftFields>, source: string) => {
    keepStatusOnNextSave.current = true;
    setDraft((d) => ({ ...emptyDraft(d.selectedVertical), ...fields, selectedVertical: fields.selectedVertical || d.selectedVertical }));
    setSaveState({ kind: "restored", source });
  }, []);

  /** Validates and keeps an image in the browser until submit. Throws an Error with a user-facing message. */
  const addImage = useCallback(async (file: File): Promise<string> => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Only JPEG, PNG, WebP and GIF images are supported.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The limit is 5 MB.`);
    }
    setUploadingImage(true);
    try {
      const base64 = await readAsBase64(file);
      const placeholderUrl = URL.createObjectURL(file);
      setDraft((d) => ({
        ...d,
        pendingImages: [...d.pendingImages, { filename: file.name, base64, mimeType: file.type || "image/png", placeholderUrl }],
      }));
      return placeholderUrl;
    } catch {
      throw new Error("Couldn't read that image in the browser.");
    } finally {
      setUploadingImage(false);
    }
  }, []);

  /** Images still used by the body or cover — only these are uploaded on submit. */
  const activeImages = useCallback(
    () => latest.current.pendingImages.filter((img) => latest.current.content.includes(img.placeholderUrl) || latest.current.coverImage === img.placeholderUrl),
    []
  );

  return {
    draft,
    set,
    saveState,
    saveNow,
    markSynced,
    recovered,
    restoreRecovered,
    discardRecovered,
    hasContent: hasAnyContent(draft),
    reset,
    loadFrom,
    addImage,
    uploadingImage,
    activeImages,
  };
}

export type ArticleDraft = ReturnType<typeof useArticleDraft>;
