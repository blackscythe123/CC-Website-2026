import { describe, expect, it } from "vitest";
import { getSubmitChecklist } from "@/lib/submitChecklist";

const base = {
  title: "A good title",
  content: "Body",
  summary: "Teaser",
  coverImage: "blob:x",
  selectedVertical: "full-stack",
  allowedVerticals: ["full-stack"],
};

describe("getSubmitChecklist", () => {
  it("allows submit when all required items pass", () => {
    const r = getSubmitChecklist(base);
    expect(r.canSubmit).toBe(true);
    expect(r.blockingReason).toBeNull();
  });
  it("blocks on a title shorter than 3 characters after trimming", () => {
    const r = getSubmitChecklist({ ...base, title: "  ab " });
    expect(r.canSubmit).toBe(false);
    expect(r.blockingReason).toBe("Add a title (at least 3 characters) to submit");
  });
  it("blocks on an empty body", () => {
    expect(getSubmitChecklist({ ...base, content: "   " }).blockingReason).toBe("Write the article body to submit");
  });
  it("blocks when the vertical is not allowed", () => {
    expect(getSubmitChecklist({ ...base, allowedVerticals: [] }).blockingReason).toBe("You need a vertical role to submit");
  });
  it("reports the first blocking reason in checklist order", () => {
    expect(getSubmitChecklist({ ...base, title: "", content: "" }).blockingReason).toMatch(/title/);
  });
  it("never blocks on missing summary or cover", () => {
    const r = getSubmitChecklist({ ...base, summary: "", coverImage: "" });
    expect(r.canSubmit).toBe(true);
    expect(r.items.find((i) => i.id === "summary")).toMatchObject({ ok: false, level: "recommended" });
    expect(r.items.find((i) => i.id === "cover")).toMatchObject({ ok: false, level: "optional" });
  });
});

describe("getSubmitChecklist slug check (matches the server's slug rule)", () => {
  it("blocks titles that slugify to fewer than two characters", async () => {
    const { slugFromTitle } = await import("@/lib/submitChecklist");
    expect(slugFromTitle("C++")).toBe("c");
    const r = getSubmitChecklist({ ...base, title: "C++" });
    expect(r.canSubmit).toBe(false);
    expect(r.blockingReason).toBe("Title needs at least two letters or digits");
  });
  it("allows 'C++ tips' and 'Go 1' and a fixed slug when revising", () => {
    expect(getSubmitChecklist({ ...base, title: "C++ tips" }).canSubmit).toBe(true);
    expect(getSubmitChecklist({ ...base, title: "Go 1" }).canSubmit).toBe(true);
    expect(getSubmitChecklist({ ...base, title: "C++", hasFixedSlug: true }).canSubmit).toBe(true);
  });
  it("still reports the length message for very short titles", () => {
    expect(getSubmitChecklist({ ...base, title: "ab" }).blockingReason).toBe("Add a title (at least 3 characters) to submit");
  });
});
