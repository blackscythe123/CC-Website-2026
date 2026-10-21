/**
 * Pure text transforms behind the editor's formatting buttons and shortcuts.
 * Each takes the textarea value and selection and returns the new value and selection.
 */

export interface EditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export type InlineFormat = "bold" | "italic" | "link";
export type LineFormat = "h2" | "h3" | "quote" | "list";

const LINE_PREFIX: Record<LineFormat, string> = {
  h2: "## ",
  h3: "### ",
  quote: "> ",
  list: "- ",
};

function newlineOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function splice(text: string, start: number, end: number, insert: string) {
  return text.slice(0, start) + insert + text.slice(end);
}

export function applyInline(text: string, start: number, end: number, format: InlineFormat): EditResult {
  const selected = text.slice(start, end);

  if (format === "link") {
    if (selected) {
      const next = splice(text, start, end, `[${selected}](url)`);
      const urlStart = start + selected.length + 3;
      return { text: next, selectionStart: urlStart, selectionEnd: urlStart + 3 };
    }
    const next = splice(text, start, end, "[text](url)");
    return { text: next, selectionStart: start + 1, selectionEnd: start + 5 };
  }

  const marker = format === "bold" ? "**" : "*";
  const next = splice(text, start, end, `${marker}${selected}${marker}`);
  return { text: next, selectionStart: start + marker.length, selectionEnd: end + marker.length };
}

export function applyLinePrefix(text: string, start: number, end: number, format: LineFormat): EditResult {
  const prefix = LINE_PREFIX[format];
  const nl = newlineOf(text);
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;

  if (start === end) {
    const nextBreak = text.indexOf("\n", start);
    const lineEnd = nextBreak === -1 ? text.length : text[nextBreak - 1] === "\r" ? nextBreak - 1 : nextBreak;
    const line = text.slice(lineStart, lineEnd);

    if (line.length > 0 && start === lineEnd) {
      // Caret at the end of a non-empty line: start a new block below it.
      const insert = `${nl}${nl}${prefix}`;
      const caret = start + insert.length;
      return { text: splice(text, start, start, insert), selectionStart: caret, selectionEnd: caret };
    }
    // Empty line or caret inside a line: prefix the current line.
    const caret = start + prefix.length;
    return { text: splice(text, lineStart, lineStart, prefix), selectionStart: caret, selectionEnd: caret };
  }

  // A selection that ends right after a line break does not include the next line.
  let effectiveEnd = end;
  if (text[effectiveEnd - 1] === "\n") effectiveEnd -= 1;
  if (text[effectiveEnd - 1] === "\r") effectiveEnd -= 1;

  const block = text.slice(lineStart, effectiveEnd);
  const prefixed = block
    .split(/(\r?\n)/)
    .map((part, i) => (i % 2 === 0 ? prefix + part : part))
    .join("");

  return {
    text: splice(text, lineStart, effectiveEnd, prefixed),
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  };
}

export function applyCode(text: string, start: number, end: number): EditResult {
  const selected = text.slice(start, end);
  const nl = newlineOf(text);

  if (selected && !selected.includes("\n")) {
    return { text: splice(text, start, end, `\`${selected}\``), selectionStart: start + 1, selectionEnd: end + 1 };
  }

  if (selected) {
    const fenced = `\`\`\`${nl}${selected}${nl}\`\`\``;
    return { text: splice(text, start, end, fenced), selectionStart: start, selectionEnd: start + fenced.length };
  }

  const before = `${nl}${nl}\`\`\`${nl}`;
  const block = `${before}${nl}\`\`\`${nl}`;
  const caret = start + before.length;
  return { text: splice(text, start, end, block), selectionStart: caret, selectionEnd: caret };
}

export function insertBlock(text: string, start: number, end: number, block: string): EditResult {
  const caret = start + block.length;
  return { text: splice(text, start, end, block), selectionStart: caret, selectionEnd: caret };
}
