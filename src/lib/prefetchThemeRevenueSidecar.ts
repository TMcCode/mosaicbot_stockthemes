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
const CACHE_NS = "theme-revenue";

type PrefetchState =
  | { status: "absent" }
  | { status: "ok"; data: ThemeRevenueV0 }
  | { status: "error" };

const inflight = new Map<string, Promise<PrefetchState>>();

/** Warm the revenue memory cache without mounting the Revenue panel. */
export function prefetchThemeRevenueSidecar(
  slug: string,
  dataBaseUrl: string,
): Promise<PrefetchState> {
  const key = themeSidecarCacheKey(dataBaseUrl, slug);
  const cached = getThemeSidecarMemory<PrefetchState>(CACHE_NS, key);
  if (cached && isThemeSidecarTerminalStatus(cached.status)) {
    return Promise.resolve(cached);
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetchThemeTableSidecarText("revenue", slug, dataBaseUrl)
    .then((raw) => {
      let next: PrefetchState;
      if (raw == null) {
        next = { status: "absent" };
      } else {
        const parsed = parseThemeRevenue(raw);
        next = revenueHasContent(parsed) ? { status: "ok", data: parsed } : { status: "absent" };
      }
      setThemeSidecarMemory(CACHE_NS, key, next);
      return next;
    })
    .catch(() => {
      const next: PrefetchState = { status: "error" };
      setThemeSidecarMemory(CACHE_NS, key, next);
      return next;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
