import type { ThemeName } from "./tokens";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "cms-theme";

export function resolveTheme(pref: ThemePreference, systemDark: boolean): ThemeName {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

/**
 * Inlined in <head> so the right theme is applied before the first paint.
 * Uses only the globals it is given (localStorage, matchMedia, document) so it can be unit-tested.
 */
export const NO_FLASH_SCRIPT = `(function () {
  var pref = "system";
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (stored === "light" || stored === "dark" || stored === "system") pref = stored;
  } catch (e) {}
  var dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();`;
