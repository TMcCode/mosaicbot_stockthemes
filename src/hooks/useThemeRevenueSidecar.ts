"use client";

import { useEffect, useState } from "react";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import {
  loadThemeRevenueSidecar,
  THEME_REVENUE_CACHE_NS,
} from "@/lib/prefetchThemeRevenueSidecar";
import type { ThemeRevenueV0 } from "@/types/theme.revenue.v0";

export type ThemeRevenueSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeRevenueV0 }
  | { status: "error" };

function initialState(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeRevenueSidecarState {
  if (slug && dataBaseUrl) {
    const cached = getThemeSidecarMemory<ThemeRevenueSidecarState>(
      THEME_REVENUE_CACHE_NS,
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
    const cached = getThemeSidecarMemory<ThemeRevenueSidecarState>(
      THEME_REVENUE_CACHE_NS,
      key,
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void loadThemeRevenueSidecar(slug, dataBaseUrl).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl, enabled]);

  return state;
}
