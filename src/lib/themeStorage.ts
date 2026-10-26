/** localStorage key for light/dark preference. */
export const STOCKTHEMES_THEME_STORAGE_KEY = "stockthemes-color-mode";

/** Site default when nothing is stored yet (mobile + desktop). */
export const STOCKTHEMES_DEFAULT_THEME: StockthemesTheme = "dark";

export type StockthemesTheme = "light" | "dark";

export function isStockthemesTheme(value: unknown): value is StockthemesTheme {
  return value === "light" || value === "dark";
}

/** Read saved preference; missing/invalid → dark. */
export function readStoredTheme(): StockthemesTheme {
  try {
    const t = localStorage.getItem(STOCKTHEMES_THEME_STORAGE_KEY);
    return isStockthemesTheme(t) ? t : STOCKTHEMES_DEFAULT_THEME;
  } catch {
    return STOCKTHEMES_DEFAULT_THEME;
  }
}

export function readThemeFromDocument(): StockthemesTheme | null {
  if (typeof document === "undefined") return null;
  const t = document.documentElement.getAttribute("data-theme");
  return isStockthemesTheme(t) ? t : null;
}

export function applyThemeToDocument(theme: StockthemesTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

/** localStorage is the only source of truth (never the SSR/boot `data-theme` attribute). */
export function resolveThemePreference(): StockthemesTheme {
  return readStoredTheme();
}

/**
 * Inline boot script for `<head>`: apply stored (or default dark) theme before paint.
 * Keep in sync with `STOCKTHEMES_THEME_STORAGE_KEY` / `STOCKTHEMES_DEFAULT_THEME`.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(STOCKTHEMES_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark")t=${JSON.stringify(STOCKTHEMES_DEFAULT_THEME)};document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(STOCKTHEMES_DEFAULT_THEME)});document.documentElement.style.colorScheme=${JSON.stringify(STOCKTHEMES_DEFAULT_THEME)};}})();`;
