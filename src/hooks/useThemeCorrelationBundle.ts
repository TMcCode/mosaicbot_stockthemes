"use client";

import { useEffect, useState } from "react";

import {
  factorAttributionHasContent,
  parseThemeFactorAttribution,
  themeFactorAttributionUrl,
} from "@/lib/themeFactorAttribution";
import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import {
  parseThemeNeighbors,
  themeNeighborsHasContent,
  themeNeighborsUrl,
} from "@/lib/themeNeighbors";
import {
  parseThemeStockCorrelations,
  themeStockCorrelationsUrl,
} from "@/lib/themeStockCorrelations";
import type { ThemeFactorAttributionV0 } from "@/types/theme.factor_attribution.v0";
import type { ThemeStockCorrelationsV0 } from "@/types/theme.stock_correlations.v0";
import type { ThemeThemeNeighborsV0 } from "@/types/theme.theme_neighbors.v0";

export type ThemeCorrelationBundleState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ok";
      attribution: ThemeFactorAttributionV0 | null;
      stockCorrelations: ThemeStockCorrelationsV0 | null;
      neighbors: ThemeThemeNeighborsV0 | null;
    }
  | { status: "absent" }
  | { status: "error" };

/** Bump when neighbor/attribution sidecar shape changes so tab remounts refetch. */
const CACHE_NS = "theme-correlation-bundle-v7";

async function fetchText(
  url: string,
  signal: AbortSignal,
): Promise<string | null> {
  const response = await fetch(url, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`sidecar ${response.status}`);
  return response.text();
}

/** Lazy-loads correlation sidecars when the Correlation tab mounts. */
export function useThemeCorrelationBundle(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeCorrelationBundleState {
  const [state, setState] = useState<ThemeCorrelationBundleState>(() => {
    if (!slug || !dataBaseUrl) return { status: "idle" };
    const cached = getThemeSidecarMemory<ThemeCorrelationBundleState>(
      CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, slug),
    );
    return cached && isThemeSidecarTerminalStatus(cached.status) ? cached : { status: "idle" };
  });

  useEffect(() => {
    if (!slug || !dataBaseUrl) return;

    const key = themeSidecarCacheKey(dataBaseUrl, slug);
    const cached = getThemeSidecarMemory<ThemeCorrelationBundleState>(CACHE_NS, key);
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const buster = stockthemesBrowserCacheBusterQuery();
    Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });

    Promise.all([
      fetchText(`${themeFactorAttributionUrl(dataBaseUrl, slug)}?${buster}`, controller.signal),
      fetchText(`${themeStockCorrelationsUrl(dataBaseUrl, slug)}?${buster}`, controller.signal),
      fetchText(`${themeNeighborsUrl(dataBaseUrl, slug)}?${buster}`, controller.signal),
    ])
      .then(([attrRaw, corrRaw, neighborsRaw]) => {
        if (cancelled) return;
        let attribution: ThemeFactorAttributionV0 | null = null;
        if (attrRaw != null) {
          try {
            const parsed = parseThemeFactorAttribution(attrRaw);
            attribution = factorAttributionHasContent(parsed) || Object.keys(parsed.cohesion).length
              ? parsed
              : null;
          } catch {
            attribution = null;
          }
        }
        const stockCorrelations =
          corrRaw != null ? parseThemeStockCorrelations(corrRaw) : null;
        const neighbors = neighborsRaw != null ? parseThemeNeighbors(neighborsRaw) : null;
        const hasAnything =
          Boolean(attribution?.cohesion?.["1Y"]) ||
          Boolean(stockCorrelations) ||
          themeNeighborsHasContent(neighbors);
        const next: ThemeCorrelationBundleState = hasAnything
          ? { status: "ok", attribution, stockCorrelations, neighbors }
          : { status: "absent" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: ThemeCorrelationBundleState = { status: "error" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, dataBaseUrl]);

  return !slug || !dataBaseUrl ? { status: "absent" } : state;
}
