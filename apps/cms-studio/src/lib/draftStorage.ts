// Native IndexedDB helper for local draft auto-saving and power-cut recovery
const DB_NAME = "CodingClubCMS";
const DB_VERSION = 1;
const STORE_NAME = "canvas_drafts";
const DRAFT_KEY = "active_draft";

export interface PendingDraftImage {
  filename: string;
  base64: string;
  mimeType?: string;
  placeholderUrl: string;
}

export interface StoredDraft {
  title: string;
  content: string;
  coverImage: string;
  coverImageBase64?: string;
  coverImageMime?: string;
  selectedVertical: string;
  summary: string;
  tags: string[];
  pendingImages: PendingDraftImage[];
  updatedAt: number;
}

export function base64ToBlobUrl(base64: string, mimeType: string = "image/png"): string {
  if (typeof window === "undefined") return "";
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to convert base64 to Blob URL, falling back to data URI", e);
    return `data:${mimeType};base64,${base64}`;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalDraft(draft: Omit<StoredDraft, "updatedAt">): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const dataToSave: StoredDraft = {
        ...draft,
        updatedAt: Date.now(),
      };
      const req = store.put(dataToSave, DRAFT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to save draft to IndexedDB:", err);
  }
}

export async function getLocalDraft(): Promise<StoredDraft | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to retrieve draft from IndexedDB:", err);
    return null;
  }
}

export async function clearLocalDraft(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(DRAFT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to clear draft in IndexedDB:", err);
  }
}
