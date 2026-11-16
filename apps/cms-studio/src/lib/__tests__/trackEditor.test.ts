import { describe, expect, it } from "vitest";
import { validateTrack } from "@coding-club/content-schema/tracks";
import { emptyItem, emptySubtopic, emptyTopic, kebab, moved, slugFromTitle, toEditable, toTrack } from "@/lib/trackEditor";

describe("track editor helpers", () => {
  it("kebab ids always start with a letter and slugs are kebab-case", () => {
    expect(kebab("Arrays & Hashing!")).toBe("arrays-hashing");
    expect(kebab("2024 Roadmap")).toBe("t-2024-roadmap");
    expect(kebab("")).toBe("topic");
    expect(slugFromTitle("DSA Sheet — 2026 Edition")).toBe("dsa-sheet-2026-edition");
  });

  it("new sections and items get valid, unique ids; existing ids are kept; empty optional fields are dropped", () => {
    const t = emptyTopic();
    t.title = "Arrays & Hashing";
    const s = emptySubtopic();
    s.title = "Arrays & Hashing"; // same title: must still get a different id
    const link = { ...emptyItem("link"), title: "Two Sum", url: " https://leetcode.com/problems/two-sum/ ", difficulty: "easy" as const };
    const video = { ...emptyItem("video"), title: "Intro", url: "https://youtu.be/dQw4w9WgXcQ", description: "  watch first " };
    s.items = [video];
    t.items = [link];
    t.subtopics = [s];
    const kept = { ...emptyTopic(), id: "dp", title: "DP" };
    const track = toTrack({ title: " DSA ", summary: "", topics: [t, kept] }, "competitive-programming");

    const result = validateTrack(track, { vertical: "competitive-programming", slug: "dsa" });
    expect(result.errors).toEqual([]);
    expect(track.title).toBe("DSA");
    expect(track.topics[0].id).toMatch(/^arrays-hashing-[a-z0-9]{4}$/);
    expect(track.topics[0].subtopics![0].id).not.toBe(track.topics[0].id);
    expect(track.topics[1]).toEqual({ id: "dp", title: "DP" });
    expect(track.topics[0].items![0]).toMatchObject({ type: "link", url: "https://leetcode.com/problems/two-sum/", difficulty: "easy" });
    expect(track.topics[0].items![0]).not.toHaveProperty("description");
    expect(track.topics[0].subtopics![0].items![0]).toMatchObject({ type: "video", description: "watch first" });
    expect(track.topics[0].subtopics![0].items![0]).not.toHaveProperty("difficulty");
  });

  it("round-trips a published track without changing it", () => {
    const published = {
      title: "T",
      summary: "s",
      vertical: "ai-ml",
      topics: [
        {
          id: "a",
          title: "A",
          description: "d",
          items: [{ id: "x1", type: "link" as const, title: "L", url: "https://e.com/", difficulty: "hard" as const }],
          subtopics: [{ id: "b", title: "B", items: [{ id: "x2", type: "video" as const, title: "V", url: "https://youtu.be/dQw4w9WgXcQ", description: "w" }] }],
        },
      ],
    };
    expect(toTrack(toEditable(published), "ai-ml")).toEqual(published);
  });

  it("moved swaps neighbours and ignores moves past the ends", () => {
    expect(moved([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moved([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

import { humanizeTrackError } from "@/lib/trackEditor";
describe("humanizeTrackError", () => {
  it("turns schema paths into section names", () => {
    expect(humanizeTrackError("topics.0.subtopics.1.items.2.url must be an https link (no user:password)")).toBe(
      "Topic 1 › Subtopic 2 › Resource 3: url must be an https link (no user:password)"
    );
    expect(humanizeTrackError("topics.2.title can't be empty")).toBe("Topic 3: title can't be empty");
    expect(humanizeTrackError("Item id \"x\" is used more than once.")).toBe("Item id \"x\" is used more than once.");
  });
});
