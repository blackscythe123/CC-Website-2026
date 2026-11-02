import { beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_DRAFT_KEY,
  clearLocalDraft,
  clearLocalDraftOnSignOut,
  draftKeyFor,
  getLocalDraft,
  saveLocalDraft,
  type StoredDraft,
} from "@/lib/draftStorage";
import { canAutosave, parseArticlePath } from "@/lib/hooks/useArticleDraft";

// Minimal in-memory IndexedDB: just what draftStorage uses (one store, get/put/delete).
type Req = { result?: unknown; error?: unknown; onsuccess?: () => void; onerror?: () => void };
let data: Map<string, unknown>;

function request(fn: () => unknown): Req {
  const req: Req = {};
  queueMicrotask(() => {
    req.result = fn();
    req.onsuccess?.();
  });
  return req;
}

function installFakeIndexedDB() {
  data = new Map();
  const store = {
    get: (k: string) => request(() => data.get(k)),
    put: (v: unknown, k: string) => request(() => void data.set(k, structuredClone(v))),
    delete: (k: string) => request(() => void data.delete(k)),
  };
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => store,
    transaction: () => ({ objectStore: () => store }),
  };
  (globalThis as unknown as { window: unknown }).window = {
    indexedDB: {
      open: () => {
        const req: Req & { onupgradeneeded?: () => void } = {};
        queueMicrotask(() => {
          req.result = db;
          req.onsuccess?.();
        });
        return req;
      },
    },
  };
}

const fields = (title: string): Omit<StoredDraft, "updatedAt"> => ({
  title,
  content: "body",
  coverImage: "",
  selectedVertical: "ai-ml",
  summary: "",
  tags: [],
  pendingImages: [],
});

describe("draftStorage (namespaced per user)", () => {
  beforeEach(installFakeIndexedDB);

  it("keys are per login and case-insensitive", () => {
    expect(draftKeyFor("Alice")).toBe(draftKeyFor("alice"));
    expect(draftKeyFor("alice")).not.toBe(draftKeyFor("bob"));
    expect(draftKeyFor("alice")).not.toBe(LEGACY_DRAFT_KEY);
  });

  it("one user's draft is invisible to another", async () => {
    await saveLocalDraft("alice", fields("Alice's post"));
    expect((await getLocalDraft("alice"))?.title).toBe("Alice's post");
    expect(await getLocalDraft("bob")).toBeNull();
  });

  it("does nothing while the login is unknown", async () => {
    await saveLocalDraft(null, fields("x"));
    await saveLocalDraft("  ", fields("x"));
    expect(data.size).toBe(0);
    expect(await getLocalDraft(undefined)).toBeNull();
  });

  it("discards the unattributable legacy active_draft instead of handing it to the first user", async () => {
    data.set(LEGACY_DRAFT_KEY, { ...fields("Old"), updatedAt: 1 });
    expect(await getLocalDraft("carol")).toBeNull();
    expect(data.has(LEGACY_DRAFT_KEY)).toBe(false);
    expect(await getLocalDraft("dave")).toBeNull();
  });

  it("ignores a malformed legacy value without crashing", async () => {
    data.set(LEGACY_DRAFT_KEY, "garbage");
    expect(await getLocalDraft("erin")).toBeNull();
  });

  it("onlyIfUpdatedAt removes only the offered snapshot", async () => {
    data.set(draftKeyFor("frank"), { ...fields("Newer"), updatedAt: 200 });
    await clearLocalDraft("frank", { onlyIfUpdatedAt: 100 });
    expect((await getLocalDraft("frank"))?.title).toBe("Newer");
    await clearLocalDraft("frank", { onlyIfUpdatedAt: 200 });
    expect(await getLocalDraft("frank")).toBeNull();
  });

  it("sign-out clears the user's draft and blocks late autosaves for it", async () => {
    await saveLocalDraft("grace", fields("Mine"));
    await saveLocalDraft("heidi", fields("Hers"));
    await clearLocalDraftOnSignOut("grace");
    expect(await getLocalDraft("grace")).toBeNull();
    await saveLocalDraft("grace", fields("flushed on pagehide"));
    expect(await getLocalDraft("grace")).toBeNull();
    expect((await getLocalDraft("heidi"))?.title).toBe("Hers");
  });
});

describe("canAutosave", () => {
  it("needs a login, a completed read and no pending recovery offer", () => {
    expect(canAutosave({ login: "a", storageReady: true, recoveryPending: false })).toBe(true);
    expect(canAutosave({ login: null, storageReady: true, recoveryPending: false })).toBe(false);
    expect(canAutosave({ login: "a", storageReady: false, recoveryPending: false })).toBe(false);
    expect(canAutosave({ login: "a", storageReady: true, recoveryPending: true })).toBe(false);
  });
});

describe("parseArticlePath", () => {
  it("reads vertical and slug from a vertical post path", () => {
    expect(parseArticlePath("content/verticals/full-stack/posts/my-post.md")).toEqual({ vertical: "full-stack", slug: "my-post" });
  });
  it("reads club announcements", () => {
    expect(parseArticlePath("content/club/posts/welcome-2026.md")).toEqual({ vertical: "club", slug: "welcome-2026" });
  });
  it("rejects anything else", () => {
    expect(parseArticlePath(null)).toBeNull();
    expect(parseArticlePath("apps/main-portal/public/uploads/x.md")).toBeNull();
    expect(parseArticlePath("content/verticals/ai-ml/posts/../x.md")).toBeNull();
  });
});
