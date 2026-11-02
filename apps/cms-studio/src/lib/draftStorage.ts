// Native IndexedDB helper for local draft auto-saving and power-cut recovery
const DB_NAME = "CodingClubCMS";
const DB_VERSION = 1;
const STORE_NAME = "canvas_drafts";
/** Pre-namespacing key shared by every user of this browser. Migrated once to the first signed-in user. */
export const LEGACY_DRAFT_KEY = "active_draft";

/** IndexedDB key for a user's draft. Logins are case-insensitive on GitHub. */
export function draftKeyFor(login: string): string {
  return `active_draft:${login.trim().toLowerCase()}`;
}

// Logins that signed out during this page's lifetime: late autosaves / unload flushes must not
// write their draft back after sign-out cleared it.
const signedOutLogins = new Set<string>();

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

function usableLogin(login: string | null | undefined): login is string {
  return typeof login === "string" && login.trim().length > 0;
}

export async function saveLocalDraft(login: string | null | undefined, draft: Omit<StoredDraft, "updatedAt">): Promise<void> {
  if (!usableLogin(login) || signedOutLogins.has(draftKeyFor(login))) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const dataToSave: StoredDraft = {
        ...draft,
        updatedAt: Date.now(),
      };
      const req = store.put(dataToSave, draftKeyFor(login));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to save draft to IndexedDB:", err);
  }
}

/**
 * Reads this user's draft. If none exists but a pre-namespacing `active_draft` does, it is moved
 * (once, in one transaction) to this user's key so the work isn't lost.
 */
export async function getLocalDraft(login: string | null | undefined): Promise<StoredDraft | null> {
  if (!usableLogin(login)) return null;
  const key = draftKeyFor(login);
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        if (req.result) return resolve(req.result as StoredDraft);
        // The pre-namespacing shared key can't be attributed to any user (on a shared lab PC it may
        // belong to someone else), so it is discarded rather than handed to whoever signs in first.
        try {
          store.delete(LEGACY_DRAFT_KEY);
        } catch {
          // best-effort cleanup
        }
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("Failed to retrieve draft from IndexedDB:", err);
    return null;
  }
}

/**
 * Removes this user's draft. With `onlyIfUpdatedAt`, removes it only if it is still that exact
 * snapshot (so discarding an offered recovery never deletes something newer).
 */
export async function clearLocalDraft(login: string | null | undefined, opts: { onlyIfUpdatedAt?: number } = {}): Promise<void> {
  if (!usableLogin(login)) return;
  const key = draftKeyFor(login);
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      if (opts.onlyIfUpdatedAt === undefined) {
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        return;
      }
      const get = store.get(key);
      get.onerror = () => reject(get.error);
      get.onsuccess = () => {
        const current = get.result as StoredDraft | undefined;
        if (!current || current.updatedAt !== opts.onlyIfUpdatedAt) return resolve();
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      };
    });
  } catch (err) {
    console.warn("Failed to clear draft in IndexedDB:", err);
  }
}

/** On sign-out: delete this user's local draft and block any further writes for it on this page. */
export async function clearLocalDraftOnSignOut(login: string | null | undefined): Promise<void> {
  if (!usableLogin(login)) return;
  signedOutLogins.add(draftKeyFor(login));
  await clearLocalDraft(login);
}
