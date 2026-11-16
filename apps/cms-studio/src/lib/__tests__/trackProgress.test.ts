import { describe, expect, it } from "vitest";
import {
  countDone,
  groupPlacedPosts,
  parseTrackProgress,
  placedPostProgressId,
  serializeTrackProgress,
  trackProgressKey,
} from "@coding-club/content-render";

describe("learning-track progress helpers", () => {
  it("namespaces and versions the storage key", () => {
    expect(trackProgressKey("competitive-programming", "dsa-starter-sheet")).toBe("cc-track:v1:competitive-programming/dsa-starter-sheet");
  });
  it("keeps unknown ids (so ticks survive track edits) but counts only current ones", () => {
    const done = parseTrackProgress('["a1","gone","post:old-blog"]');
    expect([...done].sort()).toEqual(["a1", "gone", "post:old-blog"]);
    expect(countDone(["a1", "a2"], done)).toBe(1);
    expect(serializeTrackProgress(done)).toBe('["a1","gone","post:old-blog"]');
  });
  it("survives corrupt or hostile storage", () => {
    expect(parseTrackProgress("not json").size).toBe(0);
    expect(parseTrackProgress('{"a1":true}').size).toBe(0);
    expect(parseTrackProgress(null).size).toBe(0);
    expect(parseTrackProgress('[1,null,"a1",""]').size).toBe(1);
    expect(parseTrackProgress(JSON.stringify(Array.from({ length: 5000 }, (_, i) => `x${i}`))).size).toBe(2000);
  });
  it("placed-blog ids can't collide with item ids", () => {
    expect(placedPostProgressId("two-sum")).toBe("post:two-sum");
  });
});

describe("groupPlacedPosts", () => {
  const track = { topics: [{ id: "arrays", subtopics: [{ id: "hash-maps" }] }, { id: "dp" }] };
  const post = (slug: string, date: string, placement: { track: string; topic: string; subtopic?: string } | null) => ({
    slug,
    title: slug,
    summary: "",
    date,
    href: `/posts/${slug}`,
    placement,
  });

  it("groups by topic/subtopic, orders by date then slug, missing date last", () => {
    const g = groupPlacedPosts(
      [
        post("c", "2026-03-01", { track: "dsa", topic: "dp" }),
        post("b", "", { track: "dsa", topic: "dp" }),
        post("a", "2026-03-01", { track: "dsa", topic: "dp" }),
        post("z", "2025-01-01", { track: "dsa", topic: "dp" }),
        post("h", "2026-01-01", { track: "dsa", topic: "arrays", subtopic: "hash-maps" }),
      ],
      "dsa",
      track
    );
    expect(g["dp"].map((p) => p.slug)).toEqual(["z", "a", "c", "b"]);
    expect(g["arrays/hash-maps"].map((p) => p.slug)).toEqual(["h"]);
    expect(g["arrays"]).toBeUndefined();
  });

  it("ignores other tracks, unplaced posts and dangling placements, and strips placement from output", () => {
    const g = groupPlacedPosts(
      [
        post("other", "2026-01-01", { track: "web", topic: "dp" }),
        post("none", "2026-01-01", null),
        post("gone-topic", "2026-01-01", { track: "dsa", topic: "graphs" }),
        post("gone-sub", "2026-01-01", { track: "dsa", topic: "dp", subtopic: "knapsack" }),
        post("wrong-parent", "2026-01-01", { track: "dsa", topic: "dp", subtopic: "hash-maps" }),
        post("ok", "2026-01-01", { track: "dsa", topic: "dp" }),
      ],
      "dsa",
      track
    );
    expect(Object.keys(g)).toEqual(["dp"]);
    expect(g["dp"]).toEqual([{ slug: "ok", title: "ok", summary: "", date: "2026-01-01", href: "/posts/ok" }]);
  });
});
