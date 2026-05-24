/** localStorage key for light/dark preference (must match inline script in layout). */
export const STOCKTHEMES_THEME_STORAGE_KEY = "stockthemes-theme";

export type StockthemesTheme = "light" | "dark";

export function readStoredTheme(): StockthemesTheme {
  try {
    const t = localStorage.getItem(STOCKTHEMES_THEME_STORAGE_KEY);
    return t === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function readThemeFromDocument(): StockthemesTheme | null {
  if (typeof document === "undefined") return null;
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || t === "light" ? t : null;
}

export function applyThemeToDocument(theme: StockthemesTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

/** Prefer `data-theme` set by the layout init script, then localStorage. */
export function resolveThemePreference(): StockthemesTheme {
  return readThemeFromDocument() ?? readStoredTheme();
}

/** Inline IIFE for layout `<head>` — runs before first paint. */
export function themeInitScriptContent(): string {
  const key = JSON.stringify(STOCKTHEMES_THEME_STORAGE_KEY);
  return `(function(){try{var k=${key};var t=localStorage.getItem(k);var d=t==="dark"?"dark":"light";document.documentElement.setAttribute("data-theme",d);document.documentElement.style.colorScheme=d;}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light";}})();`;
}
