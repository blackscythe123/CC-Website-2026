import { describe, expect, it } from "vitest";
import { saveStatusText } from "@/lib/saveStatus";

const at = new Date(2026, 9, 21, 14, 31);

describe("saveStatusText", () => {
  it("idle", () => expect(saveStatusText({ kind: "idle" })).toBe("Not saved yet"));
  it("saving", () => expect(saveStatusText({ kind: "saving" })).toBe("Saving…"));
  it("local", () => expect(saveStatusText({ kind: "local", at })).toMatch(/^Saved on this device · \d{1,2}:31/));
  it("synced", () => expect(saveStatusText({ kind: "synced", at })).toMatch(/^Synced to GitHub · /));
  it("restored", () => expect(saveStatusText({ kind: "restored", source: "drafts/a/b" })).toBe("Restored from drafts/a/b"));
  it("compact shows only the time", () => expect(saveStatusText({ kind: "local", at }, true)).toMatch(/^\d{1,2}:31/));
});
