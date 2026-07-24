"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  getLiveThemeDetailEntry,
  liveThemeDetailCacheKey,
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

/** One interval per theme page — treemap/chart/table hooks share it. */
type SharedPoll = {
  count: number;
  timerId: number | null;
  run: () => void;
  lastStartedAt: number;
};
const sharedPolls = new Map<string, SharedPoll>();

function startSharedLivePoll(key: string, intervalMs: number, run: () => void): () => void {
  let entry = sharedPolls.get(key);
  if (!entry) {
    entry = { count: 0, timerId: null, run, lastStartedAt: 0 };
    sharedPolls.set(key, entry);
  }
  entry.run = run;
  entry.count += 1;
  const now = Date.now();
  // Coalesce mount storms from multiple hooks on the same page.
  if (!entry.timerId) {
    entry.lastStartedAt = now;
    entry.run();
    entry.timerId = window.setInterval(() => {
      sharedPolls.get(key)?.run();
    }, intervalMs);
  } else if (now - entry.lastStartedAt > Math.min(intervalMs, 5_000)) {
    entry.lastStartedAt = now;
    entry.run();
  }

  return () => {
    const current = sharedPolls.get(key);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;
    if (current.timerId != null) window.clearInterval(current.timerId);
    sharedPolls.delete(key);
  };
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

    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    return startSharedLivePoll(key, intervalMs, () => {
      const query = priceReturnsBrowserCacheBusterQuery();
      void refreshLiveThemeDetail({
        slug,
        dataBaseUrl,
        serverDetail,
        fetchJson: (url) => fetchThemeJson(`${url}?${query}`),
        mergeOptions: {
          prices: stockthemesLivePriceReturnsEnabled(),
          compareReturns: stockthemesLivePriceReturnsEnabled(),
          composition: stockthemesLiveCompositionEnabled(),
        },
      }).catch(() => {
        // Keep server snapshot on fetch failure.
      });
    });
  }, [enabled, slug, dataBaseUrl, serverDetail, key]);

  const detail = useMemo(() => entry?.merged ?? serverDetail, [entry?.merged, serverDetail]);

  return { detail, livePrices: stockthemesLivePriceReturnsEnabled() };
}
