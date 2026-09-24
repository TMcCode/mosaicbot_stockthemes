/** localStorage key for light/dark preference. */
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

/** Prefer `data-theme` on the document, then localStorage. */
export function resolveThemePreference(): StockthemesTheme {
  return readThemeFromDocument() ?? readStoredTheme();
}
