const MAX_TAG_LENGTH = 32;

/** Adds a typed tag to the list: trims, drops commas and a leading "#", ignores empty and duplicate (case-insensitive) tags. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.replace(/,/g, "").trim().replace(/^#/, "").trim().slice(0, MAX_TAG_LENGTH);
  if (!tag) return tags;
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return tags;
  return [...tags, tag];
}
