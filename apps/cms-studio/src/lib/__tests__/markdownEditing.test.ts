import { describe, expect, it } from "vitest";
import { applyCode, applyInline, applyLinePrefix, insertBlock } from "@/lib/markdownEditing";

describe("applyInline", () => {
  it("wraps a selection in bold and keeps it selected", () => {
    expect(applyInline("say hello now", 4, 9, "bold")).toEqual({ text: "say **hello** now", selectionStart: 6, selectionEnd: 11 });
  });
  it("inserts markers with the caret between them when nothing is selected", () => {
    expect(applyInline("ab", 1, 1, "italic")).toEqual({ text: "a**b", selectionStart: 2, selectionEnd: 2 });
  });
  it("turns a selection into a link and selects the url placeholder", () => {
    const r = applyInline("see docs", 4, 8, "link");
    expect(r.text).toBe("see [docs](url)");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("url");
  });
  it("inserts an empty link with text selected when nothing is selected", () => {
    const r = applyInline("", 0, 0, "link");
    expect(r.text).toBe("[text](url)");
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe("text");
  });
  it("handles a selection of the entire text", () => {
    expect(applyInline("all", 0, 3, "bold").text).toBe("**all**");
  });
});

describe("applyLinePrefix", () => {
  it("prefixes every selected line", () => {
    expect(applyLinePrefix("a\nb\nc", 0, 3, "list").text).toBe("- a\n- b\nc");
  });
  it("does not prefix the line after a selection that ends in a newline", () => {
    expect(applyLinePrefix("a\nb", 0, 2, "quote").text).toBe("> a\nb");
  });
  it("starts a new prefixed line at the caret when nothing is selected", () => {
    const r = applyLinePrefix("intro", 5, 5, "h2");
    expect(r.text).toBe("intro\n\n## ");
    expect(r.selectionStart).toBe(r.text.length);
  });
  it("prefixes the current line when the caret is at the start of an empty line", () => {
    expect(applyLinePrefix("a\n", 2, 2, "h3").text).toBe("a\n### ");
  });
  it("keeps CRLF line endings intact", () => {
    expect(applyLinePrefix("a\r\nb", 0, 4, "list").text).toBe("- a\r\n- b");
  });
});

describe("applyCode", () => {
  it("wraps a single-line selection in backticks", () => {
    expect(applyCode("run npm i", 4, 9).text).toBe("run `npm i`");
  });
  it("fences a multi-line selection", () => {
    expect(applyCode("a\nb", 0, 3).text).toBe("```\na\nb\n```");
  });
  it("inserts an empty fenced block at the caret when nothing is selected", () => {
    const r = applyCode("x", 1, 1);
    expect(r.text).toBe("x\n\n```\n\n```\n");
    expect(r.text[r.selectionStart - 1]).toBe("\n");
  });
});

describe("insertBlock", () => {
  it("inserts a block at the caret and places the caret after it", () => {
    const r = insertBlock("ab", 1, 1, "\n\n---\n\n");
    expect(r.text).toBe("a\n\n---\n\nb");
    expect(r.selectionStart).toBe(8);
  });
  it("replaces the selection", () => {
    expect(insertBlock("abc", 0, 3, "X").text).toBe("X");
  });
});
