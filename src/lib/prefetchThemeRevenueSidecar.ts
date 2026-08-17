"use client";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import { fetchThemeTableSidecarText } from "@/lib/themeTableSidecarFetch";
import { parseThemeRevenue, revenueHasContent } from "@/lib/themeRevenue";
import type { ThemeRevenueV0 } from "@/types/theme.revenue.v0";

/** Must match useThemeRevenueSidecar cache namespace. */
export const THEME_REVENUE_CACHE_NS = "theme-revenue";

export type ThemeRevenueLoadState =
  | { status: "absent" }
  | { status: "ok"; data: ThemeRevenueV0 }
  | { status: "error" };

const inflight = new Map<string, Promise<ThemeRevenueLoadState>>();

/** Shared fetch so idle prefetch and the Revenue hook don't double-request. */
export function loadThemeRevenueSidecar(
  slug: string,
  dataBaseUrl: string,
): Promise<ThemeRevenueLoadState> {
  const key = themeSidecarCacheKey(dataBaseUrl, slug);
  const cached = getThemeSidecarMemory<ThemeRevenueLoadState>(THEME_REVENUE_CACHE_NS, key);
  if (cached && isThemeSidecarTerminalStatus(cached.status)) {
    return Promise.resolve(cached);
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetchThemeTableSidecarText("revenue", slug, dataBaseUrl)
    .then((raw) => {
      let next: ThemeRevenueLoadState;
      if (raw == null) {
        next = { status: "absent" };
      } else {
        const parsed = parseThemeRevenue(raw);
        next = revenueHasContent(parsed) ? { status: "ok", data: parsed } : { status: "absent" };
      }
      setThemeSidecarMemory(THEME_REVENUE_CACHE_NS, key, next);
      return next;
    })
    .catch(() => {
      const next: ThemeRevenueLoadState = { status: "error" };
      setThemeSidecarMemory(THEME_REVENUE_CACHE_NS, key, next);
      return next;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Warm the revenue memory cache without mounting the Revenue panel. */
export function prefetchThemeRevenueSidecar(
  slug: string,
  dataBaseUrl: string,
): Promise<ThemeRevenueLoadState> {
  return loadThemeRevenueSidecar(slug, dataBaseUrl);
}
