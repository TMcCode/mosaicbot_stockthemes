"use client";

import { useEffect, useState } from "react";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import { fetchThemeTableSidecarText } from "@/lib/themeTableSidecarFetch";
import { parseThemeRevenue, revenueHasContent } from "@/lib/themeRevenue";
import type { ThemeRevenueV0 } from "@/types/theme.revenue.v0";

export type ThemeRevenueSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeRevenueV0 }
  | { status: "error" };

/** Must match prefetchThemeRevenueSidecar cache namespace. */
const CACHE_NS = "theme-revenue";

function initialState(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeRevenueSidecarState {
  if (slug && dataBaseUrl) {
    const cached = getThemeSidecarMemory<ThemeRevenueSidecarState>(
      CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, slug),
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) return cached;
  }
  return { status: "idle" };
}

/** Lazy-fetch revenue sidecar once per theme; reuse across Revenue / Rev Revisions tab toggles. */
export function useThemeRevenueSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): ThemeRevenueSidecarState {
  const [state, setState] = useState<ThemeRevenueSidecarState>(() =>
    initialState(slug, dataBaseUrl),
  );

  useEffect(() => {
    if (!enabled) return;
    if (!slug || !dataBaseUrl) {
      setState({ status: "absent" });
      return;
    }

    const key = themeSidecarCacheKey(dataBaseUrl, slug);
    const cached = getThemeSidecarMemory<ThemeRevenueSidecarState>(CACHE_NS, key);
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchThemeTableSidecarText("revenue", slug, dataBaseUrl, controller.signal)
      .then((raw) => {
        if (cancelled) return;
        let next: ThemeRevenueSidecarState;
        if (raw == null) {
          next = { status: "absent" };
        } else {
          const parsed = parseThemeRevenue(raw);
          next = revenueHasContent(parsed) ? { status: "ok", data: parsed } : { status: "absent" };
        }
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: ThemeRevenueSidecarState = { status: "error" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, dataBaseUrl, enabled]);

  return state;
}
