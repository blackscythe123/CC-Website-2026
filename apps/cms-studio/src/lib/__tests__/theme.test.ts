import { expect, it } from "vitest";
import { NO_FLASH_SCRIPT, THEME_STORAGE_KEY, resolveTheme } from "@/lib/theme/theme";

it("explicit preferences win", () => {
  expect(resolveTheme("light", true)).toBe("light");
  expect(resolveTheme("dark", false)).toBe("dark");
});

it("system follows the OS", () => {
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
});

it("no-flash script reads the storage key and guards storage errors", () => {
  expect(NO_FLASH_SCRIPT).toContain(THEME_STORAGE_KEY);
  expect(NO_FLASH_SCRIPT).toContain("try");
});

it("no-flash script sets data-theme from a stored preference", () => {
  const root = { dataset: {} as Record<string, string> };
  const fn = new Function("localStorage", "matchMedia", "document", NO_FLASH_SCRIPT);
  fn({ getItem: () => "dark" }, () => ({ matches: false }), { documentElement: root });
  expect(root.dataset.theme).toBe("dark");
});

it("no-flash script falls back to the OS when storage throws", () => {
  const root = { dataset: {} as Record<string, string> };
  const fn = new Function("localStorage", "matchMedia", "document", NO_FLASH_SCRIPT);
  fn({ getItem: () => { throw new Error("blocked"); } }, () => ({ matches: true }), { documentElement: root });
  expect(root.dataset.theme).toBe("dark");
});
