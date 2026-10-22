import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TOKENS } from "@/lib/theme/tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf-8");

function block(selectorStart: string) {
  const at = css.indexOf(selectorStart);
  if (at === -1) return "";
  return css.slice(at, css.indexOf("}", at));
}

describe("globals.css matches tokens.ts", () => {
  const light = block(':root, [data-theme="light"]');
  const dark = block('[data-theme="dark"] {');
  it.each(Object.entries(TOKENS.light))("light --%s", (name, value) =>
    expect(light).toMatch(new RegExp(`--${name}:\\s*${value};`, "i"))
  );
  it.each(Object.entries(TOKENS.dark))("dark --%s", (name, value) =>
    expect(dark).toMatch(new RegExp(`--${name}:\\s*${value};`, "i"))
  );
});
