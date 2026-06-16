"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  getLiveThemeDetailEntry,
  liveThemeDetailCacheKey,
  mergeThemeDetailLiveFields,
  refreshLiveThemeDetail,
  seedLiveThemeDetail,
  subscribeLiveThemeDetail,
} from "@/lib/liveThemeDetailStore";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import {
  stockthemesLiveCompositionEnabled,
  stockthemesLivePriceReturnsEnabled,
} from "@/lib/stockthemesClientConfig";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

async function fetchThemeJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export function useLiveThemeDetailPrices(
  slug: string,
  dataBaseUrl: string,
  serverDetail: ThemeDetailV0,
): { detail: ThemeDetailV0; livePrices: boolean } {
  const enabled =
    stockthemesLivePriceReturnsEnabled() ||
    stockthemesLiveCompositionEnabled();
  const key = liveThemeDetailCacheKey(slug, dataBaseUrl);

  useEffect(() => {
    if (!enabled) return;
    seedLiveThemeDetail(key, serverDetail);
  }, [enabled, key, serverDetail]);

  const entry = useSyncExternalStore(
    (onStoreChange) => (enabled ? subscribeLiveThemeDetail(key, onStoreChange) : () => {}),
    () => (enabled ? getLiveThemeDetailEntry(key) : undefined),
    () => undefined,
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const run = () => {
      const url = `${dataBaseUrl}/themes/${encodeURIComponent(slug)}.json?${priceReturnsBrowserCacheBusterQuery()}`;
      refreshLiveThemeDetail({
        slug,
        dataBaseUrl,
        serverDetail,
        fetchJson: async () => fetchThemeJson(url),
        mergeOptions: {
          prices: stockthemesLivePriceReturnsEnabled(),
          compareReturns: stockthemesLivePriceReturnsEnabled(),
          composition: stockthemesLiveCompositionEnabled(),
        },
      }).catch(() => {
        if (!cancelled) {
          // Keep server snapshot on fetch failure.
        }
      });
    };

    run();
    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    const id = window.setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, slug, dataBaseUrl, serverDetail, key]);

  const detail = useMemo(() => entry?.merged ?? serverDetail, [entry?.merged, serverDetail]);

  return { detail, livePrices: stockthemesLivePriceReturnsEnabled() };
}
