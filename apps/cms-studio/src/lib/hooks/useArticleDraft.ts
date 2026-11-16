"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  base64ToBlobUrl,
  clearLocalDraft,
  getLocalDraft,
  isSignedOutLogin,
  reportEditorSynced,
  reportEditorWork,
  saveLocalDraft,
  type PendingDraftImage,
  type StoredDraft,
  type StoredRevision,
} from "@/lib/draftStorage";
import type { SaveState } from "@/lib/saveStatus";
import type { Placement } from "@coding-club/content-schema/tracks";

export interface DraftFields {
  title: string;
  content: string;
  coverImage: string;
  selectedVertical: string;
  summary: string;
  tags: string[];
  pendingImages: PendingDraftImage[];
  /** Where the blog sits in a learning track, or null for a normal blog only. */
  placement: Placement | null;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** Per-image cap: the whole submit/sync payload must stay under the ~4 MB request limit. */
// base64 adds ~33%, and the request budget for images is ~3.5 MB (Vercel caps bodies at 4.5 MB).
export const MAX_IMAGE_BYTES = Math.floor(2.5 * 1024 * 1024);
const EXT_FOR_MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/**
 * Filename stored for an upload: a safe base plus the extension implied by the MIME type, so the
 * server (which validates by extension) accepts names like "image", "download" or "photo.jfif".
 */
export function normalizedImageName(originalName: string, mimeType: string): string {
  const ext = EXT_FOR_MIME[mimeType] || "png";
  const stem = originalName.replace(/^.*[\\/]/, "").replace(/\.[^.]*$/, "");
  const safeBase = stem.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "image";
  return `${safeBase}.${ext}`;
}

function fingerprintOf(d: DraftFields) {
  return `${d.title}\u0000${d.content}\u0000${d.coverImage}\u0000${d.pendingImages.length}`;
}
const AUTOSAVE_MS = 2000;

function emptyDraft(vertical: string): DraftFields {
  return { title: "", content: "", coverImage: "", selectedVertical: vertical, summary: "", tags: [], pendingImages: [], placement: null };
}

function hasAnyContent(d: DraftFields) {
  return Boolean(d.title.trim() || d.content.trim() || d.pendingImages.length > 0);
}

/**
 * Whether the editor may write to this device's draft slot right now. Not while the user is
 * unknown, not before the stored draft was read, and not while a recovery offer is pending
 * (that would overwrite the very snapshot being offered).
 */
export function canAutosave(s: { login: string | null | undefined; storageReady: boolean; recoveryPending: boolean }) {
  return Boolean(s.login && s.login.trim()) && s.storageReady && !s.recoveryPending;
}

/** `content/verticals/<v>/posts/<slug>.md` or `content/club/posts/<slug>.md` → { vertical, slug }. */
export function parseArticlePath(filePath: string | null | undefined): { vertical: string; slug: string } | null {
  if (!filePath) return null;
  const m = /^content\/(?:verticals\/([a-z0-9-]+)|club)\/posts\/([a-z0-9][a-z0-9-]*)\.mdx?$/.exec(filePath);
  if (!m) return null;
  return { vertical: m[1] || "club", slug: m[2] };
}

/** Resolves false when the browser refused the write (private mode, quota). */
async function persist(login: string | null, d: DraftFields, revision: StoredRevision | null): Promise<boolean> {
  const cover = d.pendingImages.find((img) => img.placeholderUrl === d.coverImage);
  return saveLocalDraft(login, {
    title: d.title,
    content: d.content,
    coverImage: d.coverImage,
    coverImageBase64: cover?.base64,
    coverImageMime: cover?.mimeType,
    selectedVertical: d.selectedVertical,
    summary: d.summary,
    tags: d.tags,
    pendingImages: d.pendingImages,
    placement: d.placement,
    revision,
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
 * The local draft is namespaced by `login`; nothing is read or written until it is known.
 */
/**
 * Rebuild a recovered draft's images with fresh blob URLs (the old session's URLs are dead).
 * The cover must point at an entry in pendingImages, or submit can't upload it and the article
 * ships a dead blob: link. A cover stored only as base64 is re-added to pendingImages.
 */
export function rebuildRecoveredImages(
  recovered: {
    content?: string;
    coverImage?: string;
    coverImageBase64?: string;
    coverImageMime?: string;
    pendingImages?: { filename: string; base64: string; mimeType?: string; placeholderUrl: string }[];
  },
  makeUrl: (base64: string, mime: string) => string
) {
  let content = recovered.content || "";
  let cover = recovered.coverImage || "";
  let coverMatched = false;
  const images = (recovered.pendingImages || []).map((img) => {
    const fresh = makeUrl(img.base64, img.mimeType || "image/png");
    if (img.placeholderUrl) {
      content = content.replaceAll(img.placeholderUrl, fresh);
      if (!coverMatched && cover === img.placeholderUrl) {
        cover = fresh;
        coverMatched = true;
      }
    }
    return { ...img, placeholderUrl: fresh };
  });
  if (!coverMatched && cover.startsWith("blob:")) {
    if (recovered.coverImageBase64) {
      const mime = recovered.coverImageMime || "image/png";
      const fresh = makeUrl(recovered.coverImageBase64, mime);
      const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
      images.push({ filename: `cover.${ext || "png"}`, base64: recovered.coverImageBase64, mimeType: mime, placeholderUrl: fresh });
      cover = fresh;
    } else {
      cover = ""; // unrecoverable: drop it rather than publish a dead link
    }
  }
  return { content, cover, images };
}

export function useArticleDraft(initialVertical: string, login: string | null | undefined) {
  const userLogin = login && login.trim() ? login : null;
  const [draft, setDraft] = useState<DraftFields>(() => emptyDraft(initialVertical));
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [recovered, setRecovered] = useState<StoredDraft | null>(null);
  const [storageReadyFor, setStorageReadyFor] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [revisionCtx, setRevisionCtx] = useState<StoredRevision | null>(null);

  const storageReady = userLogin !== null && storageReadyFor === userLogin;
  const autosaveAllowed = canAutosave({ login: userLogin, storageReady, recoveryPending: recovered !== null });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false); // edits not yet written to IndexedDB
  const keepStatusOnNextSave = useRef(false);
  const latest = useRef(draft);
  latest.current = draft;
  const loginRef = useRef(userLogin);
  loginRef.current = userLogin;
  const allowedRef = useRef(autosaveAllowed);
  allowedRef.current = autosaveAllowed;
  const revisionRef = useRef(revisionCtx);
  revisionRef.current = revisionCtx;
  const everHadContent = useRef(false);

  const set = useCallback(<K extends keyof DraftFields>(key: K, value: DraftFields[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  // Offer to restore an unsaved draft this user left in this browser.
  useEffect(() => {
    if (!userLogin) return;
    let cancelled = false;
    getLocalDraft(userLogin).then((stored) => {
      if (cancelled) return;
      if (stored && (stored.title?.trim() || stored.content?.trim() || stored.pendingImages?.length)) {
        setRecovered(stored);
      }
      setStorageReadyFor(userLogin);
    });
    return () => {
      cancelled = true;
    };
  }, [userLogin]);

  /** Write the latest editor state now if there are unsaved edits (unmount / page hide). Fire-and-forget. */
  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current || !allowedRef.current || !hasAnyContent(latest.current)) return;
    dirty.current = false;
    persist(loginRef.current, latest.current, revisionRef.current)
      .then((ok) => {
        if (!ok) dirty.current = true;
      })
      .catch(() => {
        dirty.current = true;
      });
  }, []);

  // Debounced autosave to IndexedDB (suspended while a recovery offer is pending).
  useEffect(() => {
    reportEditorWork(hasAnyContent(draft), fingerprintOf(draft));
    if (!hasAnyContent(draft)) {
      // The user emptied the editor after content had been saved: a stale snapshot must not be offered back later.
      if (everHadContent.current && autosaveAllowed) {
        everHadContent.current = false;
        dirty.current = false;
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        void clearLocalDraft(loginRef.current);
        setSaveState({ kind: "idle" });
      }
      return;
    }
    everHadContent.current = true;
    dirty.current = true;
    if (!autosaveAllowed) return; // written once storage is ready and the user picks Restore / Discard
    const quiet = keepStatusOnNextSave.current;
    keepStatusOnNextSave.current = false;
    if (!quiet) setSaveState({ kind: "saving" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
      dirty.current = false;
      try {
        const ok = await persist(loginRef.current, latest.current, revisionRef.current);
        if (ok) {
          if (!quiet) setSaveState({ kind: "local", at: new Date() });
        } else {
          dirty.current = true;
          setSaveState({ kind: "failed" });
        }
      } catch {
        dirty.current = true;
        setSaveState({ kind: "failed" });
      }
    }, AUTOSAVE_MS);
    return () => {
      // Only cancels the debounce: pending edits stay `dirty` and are flushed on unmount / page hide.
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [draft, autosaveAllowed, revisionCtx]);

  // Flush pending edits on in-app navigation (unmount), tab hide and page unload.
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [flush]);

  // Warn before leaving with work in the editor.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // After sign-out the draft is gone and autosave is blocked: never trap the user on the page.
      if (isSignedOutLogin(loginRef.current)) return;
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
    if (!allowedRef.current) return; // never overwrite a pending recovery offer
    dirty.current = false;
    const ok = await persist(loginRef.current, latest.current, revisionRef.current);
    if (ok) setSaveState({ kind: "local", at: new Date() });
    else {
      dirty.current = true;
      setSaveState({ kind: "failed" });
    }
  }, []);

  /** Fingerprint of the editor right now; capture it BEFORE a sync request and pass it to markSynced. */
  const fingerprint = useCallback(() => fingerprintOf(latest.current), []);

  const markSynced = useCallback((sentFingerprint?: string) => {
    reportEditorSynced(sentFingerprint ?? fingerprintOf(latest.current));
    setSaveState({ kind: "synced", at: new Date() });
  }, []);

  const restoreRecovered = useCallback(() => {
    if (!recovered) return;
    // Blob URLs from the previous session are dead: rebuild them from the stored base64.
    const { content, cover, images } = rebuildRecoveredImages(recovered, base64ToBlobUrl);

    keepStatusOnNextSave.current = true;
    setDraft((d) => ({
      title: recovered.title || "",
      content,
      coverImage: cover,
      selectedVertical: recovered.selectedVertical || d.selectedVertical,
      summary: recovered.summary || "",
      tags: recovered.tags || [],
      pendingImages: images,
      placement: recovered.placement ?? null,
    }));
    setSaveState({ kind: "local", at: new Date(recovered.updatedAt) });
    setRecovered(null);
  }, [recovered]);

  /** Drop only the offered snapshot; the editor's current content is kept and autosave resumes. */
  const discardRecovered = useCallback(async () => {
    if (!recovered) return;
    await clearLocalDraft(loginRef.current, { onlyIfUpdatedAt: recovered.updatedAt });
    setRecovered(null);
  }, [recovered]);

  /** Start a brand-new post: clears the editor and this device's autosave. */
  const reset = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    dirty.current = false;
    await clearLocalDraft(loginRef.current);
    everHadContent.current = false;
    setRevisionCtx(null);
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
      throw new Error(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The limit is 2.5 MB per image.`);
    }
    setUploadingImage(true);
    try {
      const base64 = await readAsBase64(file);
      const placeholderUrl = URL.createObjectURL(file);
      setDraft((d) => ({
        ...d,
        pendingImages: [...d.pendingImages, { filename: normalizedImageName(file.name, file.type), base64, mimeType: file.type || "image/png", placeholderUrl }],
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
    fingerprint,
    recovered,
    restoreRecovered,
    discardRecovered,
    hasContent: hasAnyContent(draft),
    reset,
    loadFrom,
    /** Tell the draft which open PR it revises, so a later Restore doesn't open a second PR. */
    setRevisionContext: setRevisionCtx,
    /** Add images (e.g. cloud-draft images) that Submit must upload. */
    addPendingImages: (imgs: PendingDraftImage[]) => setDraft((d) => ({ ...d, pendingImages: [...d.pendingImages, ...imgs] })),
    addImage,
    uploadingImage,
    activeImages,
  };
}

export type ArticleDraft = ReturnType<typeof useArticleDraft>;
