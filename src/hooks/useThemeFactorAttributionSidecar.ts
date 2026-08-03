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
  themeTableSidecarBrowserCacheBusterQuery,
  themeTableSidecarBrowserFetchCache,
} from "@/lib/themeTableSidecarFetch";
import type { ThemeFactorAttributionV0 } from "@/types/theme.factor_attribution.v0";

export type ThemeFactorAttributionSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeFactorAttributionV0 }
  | { status: "error" };

const CACHE_NS = "theme-factor-attribution";

/** Fetches attribution after Factor Drivers mounts; caches for later remounts. */
export function useThemeFactorAttributionSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeFactorAttributionSidecarState {
  const [state, setState] = useState<ThemeFactorAttributionSidecarState>(() => {
    if (!slug || !dataBaseUrl) return { status: "idle" };
    const cached = getThemeSidecarMemory<ThemeFactorAttributionSidecarState>(
      CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, slug),
    );
    return cached && isThemeSidecarTerminalStatus(cached.status) ? cached : { status: "idle" };
  });

  useEffect(() => {
    if (!slug || !dataBaseUrl) return;

    const key = themeSidecarCacheKey(dataBaseUrl, slug);
    const cached = getThemeSidecarMemory<ThemeFactorAttributionSidecarState>(CACHE_NS, key);
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const url = `${themeFactorAttributionUrl(dataBaseUrl, slug)}?${themeTableSidecarBrowserCacheBusterQuery()}`;
    Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });
    fetch(url, {
      credentials: "omit",
      cache: themeTableSidecarBrowserFetchCache(),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`factor attribution sidecar ${response.status}`);
        return response.text();
      })
      .then((raw) => {
        if (cancelled) return;
        if (raw === null) {
          const next: ThemeFactorAttributionSidecarState = { status: "absent" };
          setThemeSidecarMemory(CACHE_NS, key, next);
          setState(next);
          return;
        }
        const parsed = parseThemeFactorAttribution(raw);
        const next: ThemeFactorAttributionSidecarState = factorAttributionHasContent(parsed)
          ? { status: "ok", data: parsed }
          : { status: "absent" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: ThemeFactorAttributionSidecarState = { status: "error" };
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
