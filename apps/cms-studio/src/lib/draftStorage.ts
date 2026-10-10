// Native IndexedDB helper for local draft auto-saving and power-cut recovery
const DB_NAME = "CodingClubCMS";
const DB_VERSION = 1;
const STORE_NAME = "canvas_drafts";
const DRAFT_KEY = "active_draft";

export interface StoredDraft {
  title: string;
  content: string;
  coverImage: string;
  selectedVertical: string;
  summary: string;
  tags: string[];
  pendingImages: {
    filename: string;
    base64: string;
    placeholderUrl: string;
  }[];
  updatedAt: number;
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
    console.warn("Failed to auto-save draft to IndexedDB:", err);
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
