// Native IndexedDB helper for local draft auto-saving and power-cut recovery
import type { Placement } from "@coding-club/content-schema/tracks";
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

/** The open pull request a draft is a revision of, so Restore doesn't make a second PR. */
export interface StoredRevision {
  number: number;
  branch: string;
  title: string;
  filePath: string | null;
  slug: string | null;
  vertical: string | null;
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
  /** Where the blog sits in a learning track (optional; older drafts don't have it). */
  placement?: Placement | null;
  /** Set while the draft is a revision of an open PR; re-verified against GitHub on Restore. */
  revision?: StoredRevision | null;
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

/**
 * Writes this user's draft. Resolves true when it is stored (or when there is nothing to write
 * because nobody is signed in / the user just signed out), false when storage failed
 * (private mode, quota, blocked IndexedDB) so the UI can say "Not saved on this device".
 */
export async function saveLocalDraft(login: string | null | undefined, draft: Omit<StoredDraft, "updatedAt">): Promise<boolean> {
  if (!usableLogin(login) || signedOutLogins.has(draftKeyFor(login))) return true;
  try {
    const db = await openDB();
    return await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const hasTxEvents = "oncomplete" in tx; // real IDBTransaction; minimal fakes lack it
        const store = tx.objectStore(STORE_NAME);
        const dataToSave: StoredDraft = {
          ...draft,
          updatedAt: Date.now(),
        };
        const req = store.put(dataToSave, draftKeyFor(login));
        req.onerror = () => resolve(false);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
        // Only report success once the transaction has committed.
        tx.oncomplete = () => resolve(true);
        if (!hasTxEvents) req.onsuccess = () => resolve(true);
      } catch (err) {
        console.warn("Failed to save draft to IndexedDB:", err);
        resolve(false);
      }
    });
  } catch (err) {
    console.warn("Failed to save draft to IndexedDB:", err);
    return false;
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

/** True once this user has signed out on this page (autosave is blocked; unload guards must not nag). */
export function isSignedOutLogin(login: string | null | undefined): boolean {
  return usableLogin(login) && signedOutLogins.has(draftKeyFor(login));
}

// What the editor currently holds, so sign-out can warn before discarding unsynced work.
const editorWork = { tracked: false, hasContent: false, fingerprint: "", syncedFingerprint: null as string | null };

/** Called by the editor on every change. */
export function reportEditorWork(hasContent: boolean, fingerprint: string): void {
  editorWork.tracked = true;
  editorWork.hasContent = hasContent;
  editorWork.fingerprint = fingerprint;
}

/** Called after a successful sync to GitHub of the content with this fingerprint. */
export function reportEditorSynced(fingerprint: string): void {
  editorWork.syncedFingerprint = fingerprint;
}

/**
 * Whether signing out would discard work that isn't on GitHub. Uses the live editor when it has
 * reported in; otherwise falls back to whatever this device has stored for the user.
 */
export async function hasUnsyncedWork(login: string | null | undefined): Promise<boolean> {
  if (editorWork.tracked) {
    return editorWork.hasContent && editorWork.fingerprint !== editorWork.syncedFingerprint;
  }
  const stored = await getLocalDraft(login);
  return Boolean(stored && (stored.title?.trim() || stored.content?.trim() || stored.pendingImages?.length));
}

/** Test hook: forget what the editor reported. */
export function resetEditorWorkForTests(): void {
  editorWork.tracked = false;
  editorWork.hasContent = false;
  editorWork.fingerprint = "";
  editorWork.syncedFingerprint = null;
}

// ---------------------------------------------------------------------------
// Learning-track editor drafts: same database and store, key track:<login>:<vertical>/<slug|new>.
// ---------------------------------------------------------------------------

export interface StoredTrackDraft<T = unknown> {
  value: T;
  updatedAt: number;
}

function trackDraftKey(login: string, key: string): string {
  return `track:${login.trim().toLowerCase()}:${key}`;
}

async function trackStore<R>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<R | null> {
  try {
    const db = await openDB();
    return await new Promise<R | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const req = run(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve((req.result as R) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function saveTrackDraft<T>(login: string | null | undefined, key: string, value: T): Promise<void> {
  if (!usableLogin(login) || signedOutLogins.has(draftKeyFor(login))) return;
  const record: StoredTrackDraft<T> = { value, updatedAt: Date.now() };
  await trackStore("readwrite", (s) => s.put(record, trackDraftKey(login, key)));
}

export async function getTrackDraft<T>(login: string | null | undefined, key: string): Promise<StoredTrackDraft<T> | null> {
  if (!usableLogin(login)) return null;
  return trackStore<StoredTrackDraft<T>>("readonly", (s) => s.get(trackDraftKey(login, key)));
}

export async function clearTrackDraft(login: string | null | undefined, key: string): Promise<void> {
  if (!usableLogin(login)) return;
  await trackStore("readwrite", (s) => s.delete(trackDraftKey(login, key)));
}
