"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyThemeToDocument,
  readStoredTheme,
  STOCKTHEMES_DEFAULT_THEME,
  STOCKTHEMES_THEME_STORAGE_KEY,
  type StockthemesTheme,
} from "@/lib/themeStorage";

import styles from "./ThemeRoot.module.css";

export type { StockthemesTheme };

type ThemeContextValue = {
  theme: StockthemesTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Survives React Strict Mode remounts in dev so we don’t re-read storage as a
 * conflicting value and flash the wrong theme.
 */
let clientThemeCache: StockthemesTheme | null = null;

function readClientTheme(): StockthemesTheme {
  if (clientThemeCache) return clientThemeCache;
  if (typeof window === "undefined") return STOCKTHEMES_DEFAULT_THEME;
  // Storage only — never prefer <html data-theme>, which can lag or fight React.
  const next = readStoredTheme();
  clientThemeCache = next;
  return next;
}

export function useStockthemesTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useStockthemesTheme must be used within ThemeRoot");
  }
  return ctx;
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  // Always start with the SSR default so server HTML matches the first client render.
  const [theme, setTheme] = useState<StockthemesTheme>(STOCKTHEMES_DEFAULT_THEME);

  useLayoutEffect(() => {
    const next = readClientTheme();
    applyThemeToDocument(next);
    setTheme((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STOCKTHEMES_THEME_STORAGE_KEY) return;
      if (e.newValue !== "light" && e.newValue !== "dark") return;
      clientThemeCache = e.newValue;
      applyThemeToDocument(e.newValue);
      setTheme(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: StockthemesTheme = prev === "dark" ? "light" : "dark";
      clientThemeCache = next;
      applyThemeToDocument(next);
      try {
        localStorage.setItem(STOCKTHEMES_THEME_STORAGE_KEY, next);
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <div className={`st-theme ${styles.root}`} data-theme={theme} suppressHydrationWarning>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
