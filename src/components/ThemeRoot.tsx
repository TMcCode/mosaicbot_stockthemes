"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { STOCKTHEMES_THEME_STORAGE_KEY } from "@/lib/themeStorage";

import styles from "./ThemeRoot.module.css";

export type StockthemesTheme = "light" | "dark";

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

function readStoredTheme(): StockthemesTheme {
  try {
    const t = localStorage.getItem(STOCKTHEMES_THEME_STORAGE_KEY);
    return t === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<StockthemesTheme>(() => readStoredTheme());

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
    setTheme((prev) => {
      const next: StockthemesTheme = prev === "dark" ? "light" : "dark";
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
