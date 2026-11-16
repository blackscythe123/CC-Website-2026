import type { Track, TrackItem } from "@coding-club/content-schema/tracks";

// Editable form of a learning track. Sections/items keep their published `id`; new ones get an id
// generated once, when the track is converted for submit (never from later title edits).

export interface EditItem {
  key: string;
  id?: string;
  type: "link" | "video";
  title: string;
  url: string;
  difficulty: "" | "easy" | "medium" | "hard";
  description: string;
}
export interface EditSubtopic {
  key: string;
  id?: string;
  title: string;
  description: string;
  items: EditItem[];
}
export interface EditTopic extends EditSubtopic {
  subtopics: EditSubtopic[];
}
export interface EditTrack {
  title: string;
  summary: string;
  topics: EditTopic[];
}

let keySeq = 0;
/** React key for a row (not persisted to the track file). */
export function newKey(): string {
  keySeq += 1;
  return `k${Date.now().toString(36)}${keySeq}`;
}

function randomChars(n: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** "Arrays & Hashing!" → "arrays-hashing"; always starts with a letter. */
export function kebab(text: string, max = 30): string {
  const s = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  if (!s) return "topic";
  return /^[a-z]/.test(s) ? s : `t-${s}`;
}

/** Track short name suggested from its title (kebab-case, ≤ 60). */
export function slugFromTitle(title: string): string {
  return text60(title);
}
function text60(t: string) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function emptyItem(type: "link" | "video"): EditItem {
  return { key: newKey(), type, title: "", url: "", difficulty: "", description: "" };
}
export function emptySubtopic(): EditSubtopic {
  return { key: newKey(), title: "", description: "", items: [] };
}
export function emptyTopic(): EditTopic {
  return { key: newKey(), title: "", description: "", items: [], subtopics: [] };
}
export function emptyTrack(): EditTrack {
  return { title: "", summary: "", topics: [emptyTopic()] };
}

function toEditItem(i: TrackItem): EditItem {
  return {
    key: newKey(),
    id: i.id,
    type: i.type,
    title: i.title,
    url: i.url,
    difficulty: i.type === "link" ? i.difficulty || "" : "",
    description: i.description || "",
  };
}

export function toEditable(track: Track): EditTrack {
  return {
    title: track.title,
    summary: track.summary || "",
    topics: track.topics.map((t) => ({
      key: newKey(),
      id: t.id,
      title: t.title,
      description: t.description || "",
      items: (t.items || []).map(toEditItem),
      subtopics: (t.subtopics || []).map((s) => ({
        key: newKey(),
        id: s.id,
        title: s.title,
        description: s.description || "",
        items: (s.items || []).map(toEditItem),
      })),
    })),
  };
}

/**
 * Track file for submit. Existing ids are kept; new sections get `<kebab-of-title>-<4 random>` and new
 * items `<5 random>`, unique within the track (so a deleted-and-re-added topic never reuses an id).
 */
export function toTrack(e: EditTrack, vertical: string): Track {
  const sectionIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const t of e.topics) {
    if (t.id) sectionIds.add(t.id);
    for (const s of t.subtopics) if (s.id) sectionIds.add(s.id);
    for (const i of [...t.items, ...t.subtopics.flatMap((s) => s.items)]) if (i.id) itemIds.add(i.id);
  }
  const sectionId = (current: string | undefined, title: string) => {
    if (current) return current;
    let id: string;
    do id = `${kebab(title || "topic")}-${randomChars(4)}`;
    while (sectionIds.has(id));
    sectionIds.add(id);
    return id;
  };
  const itemId = (current: string | undefined) => {
    if (current) return current;
    let id: string;
    do id = randomChars(5);
    while (itemIds.has(id));
    itemIds.add(id);
    return id;
  };
  const item = (i: EditItem): TrackItem => {
    const base = { id: itemId(i.id), title: i.title.trim(), url: i.url.trim(), ...(i.description.trim() ? { description: i.description.trim() } : {}) };
    return i.type === "link"
      ? { ...base, type: "link", ...(i.difficulty ? { difficulty: i.difficulty } : {}) }
      : { ...base, type: "video" };
  };
  return {
    title: e.title.trim(),
    summary: e.summary.trim(),
    vertical,
    topics: e.topics.map((t) => ({
      id: sectionId(t.id, t.title),
      title: t.title.trim(),
      ...(t.description.trim() ? { description: t.description.trim() } : {}),
      ...(t.items.length ? { items: t.items.map(item) } : {}),
      ...(t.subtopics.length
        ? {
            subtopics: t.subtopics.map((s) => ({
              id: sectionId(s.id, s.title),
              title: s.title.trim(),
              ...(s.description.trim() ? { description: s.description.trim() } : {}),
              ...(s.items.length ? { items: s.items.map(item) } : {}),
            })),
          }
        : {}),
    })),
  };
}

/** Move an element of `list` up (-1) or down (+1); returns a new array (unchanged at the ends). */
export function moved<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
