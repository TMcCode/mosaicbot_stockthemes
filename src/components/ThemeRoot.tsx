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
  resolveThemePreference,
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

export function useStockthemesTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useStockthemesTheme must be used within ThemeRoot");
  }
  return ctx;
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  // Match SSR default; sync from layout init script + storage before paint (avoids hydration mismatch).
  const [theme, setTheme] = useState<StockthemesTheme>("light");

  useLayoutEffect(() => {
    setTheme(resolveThemePreference());
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(STOCKTHEMES_THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STOCKTHEMES_THEME_STORAGE_KEY) return;
      if (e.newValue === "light" || e.newValue === "dark") {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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
