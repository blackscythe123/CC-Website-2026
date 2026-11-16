import { describe, expect, it } from "vitest";
import { countDone, parseTrackProgress, serializeTrackProgress, trackProgressKey } from "@coding-club/content-render";

describe("learning-track progress helpers", () => {
  it("namespaces and versions the storage key", () => {
    expect(trackProgressKey("competitive-programming", "dsa-starter-sheet")).toBe("cc-track:v1:competitive-programming/dsa-starter-sheet");
  });
  it("keeps only ids that still exist (prunes removed items) and survives corrupt storage", () => {
    expect([...parseTrackProgress('["a1","gone","a3"]', ["a1", "a2", "a3"])].sort()).toEqual(["a1", "a3"]);
    expect(parseTrackProgress("not json", ["a1"]).size).toBe(0);
    expect(parseTrackProgress('{"a1":true}', ["a1"]).size).toBe(0);
    expect(parseTrackProgress(null, ["a1"]).size).toBe(0);
    expect(parseTrackProgress("[1,null,\"a1\"]", ["a1"]).size).toBe(1);
  });
  it("round-trips and counts only current items", () => {
    const done = parseTrackProgress(serializeTrackProgress(new Set(["b", "a"])), ["a", "b", "c"]);
    expect(serializeTrackProgress(done)).toBe('["a","b"]');
    expect(countDone(["a", "b", "c"], done)).toBe(2);
    expect(countDone(["c"], done)).toBe(0);
  });
});
