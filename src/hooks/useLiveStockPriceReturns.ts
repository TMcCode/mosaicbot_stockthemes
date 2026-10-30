"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  getLiveStockPriceReturnsEntry,
  liveStockPriceReturnsCacheKey,
  refreshLiveStockPriceReturns,
  seedLiveStockPriceReturns,
  subscribeLiveStockPriceReturns,
  type LiveStockPriceReturns,
} from "@/lib/liveStockPriceReturnsStore";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLivePriceReturnsEnabled } from "@/lib/stockthemesClientConfig";
import type { ConstituentPriceReturnsV0 } from "@/types/theme.detail.v0";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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

export function useLiveStockPriceReturns(
  ticker: string,
  dataBaseUrl: string,
  serverPriceReturns: ConstituentPriceReturnsV0 | null | undefined,
  serverAsOf?: string,
  /**
   * Stock pages in slim/CDN mode strip Tier B from SSR and must fetch
   * `/cdn-app/stocks/*.price_returns.v0.json` even when the global live-price
   * flag is off (default in `next dev`).
   */
  forceClientFetch = false,
): { priceReturns: ConstituentPriceReturnsV0 | null; livePrices: boolean } {
  const liveFlag = stockthemesLivePriceReturnsEnabled();
  const enabled = Boolean(dataBaseUrl) && (liveFlag || forceClientFetch);
  const key = liveStockPriceReturnsCacheKey(ticker, dataBaseUrl);
  const serverSeed = useMemo((): LiveStockPriceReturns | null => {
    if (!serverPriceReturns) return null;
    return { priceReturns: serverPriceReturns, asOf: serverAsOf };
  }, [serverPriceReturns, serverAsOf]);

  useEffect(() => {
    if (!enabled || !serverSeed) return;
    seedLiveStockPriceReturns(key, serverSeed);
  }, [enabled, key, serverSeed]);

  const entry = useSyncExternalStore(
    (onStoreChange) =>
      enabled ? subscribeLiveStockPriceReturns(key, onStoreChange) : () => {},
    () => (enabled ? getLiveStockPriceReturnsEntry(key) : undefined),
    () => undefined,
  );

  useEffect(() => {
    if (!enabled || !ticker || !dataBaseUrl) return;
    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    return startSharedLivePoll(key, intervalMs, () => {
      const query = priceReturnsBrowserCacheBusterQuery();
      void refreshLiveStockPriceReturns({
        ticker,
        dataBaseUrl,
        server: serverSeed,
        fetchJson: (url) => fetchJson(`${url}?${query}`),
      }).catch(() => {
        /* keep server snapshot */
      });
    });
  }, [enabled, ticker, dataBaseUrl, serverSeed, key]);

  const priceReturns = useMemo(
    () => entry?.merged.priceReturns ?? serverPriceReturns ?? null,
    [entry?.merged.priceReturns, serverPriceReturns],
  );

  return { priceReturns, livePrices: enabled };
}
