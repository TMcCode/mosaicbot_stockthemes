"use client";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import {
  parseStockRevenue,
  stockRevenueHasContent,
  stockRevenueUrl,
} from "@/lib/stockRevenue";
import {
  themeTableSidecarBrowserCacheBusterQuery,
  themeTableSidecarBrowserFetchCache,
} from "@/lib/themeTableSidecarFetch";
import type { StockRevenueV0 } from "@/types/stock.revenue.v0";

export const STOCK_REVENUE_CACHE_NS = "stock-revenue";

export type StockRevenueLoadState =
  | { status: "absent" }
  | { status: "ok"; data: StockRevenueV0 }
  | { status: "error" };

const inflight = new Map<string, Promise<StockRevenueLoadState>>();

export function loadStockRevenueSidecar(
  ticker: string,
  dataBaseUrl: string,
): Promise<StockRevenueLoadState> {
  const key = themeSidecarCacheKey(dataBaseUrl, ticker.toUpperCase());
  const cached = getThemeSidecarMemory<StockRevenueLoadState>(STOCK_REVENUE_CACHE_NS, key);
  if (cached && isThemeSidecarTerminalStatus(cached.status)) {
    return Promise.resolve(cached);
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<StockRevenueLoadState> => {
    const q = themeTableSidecarBrowserCacheBusterQuery();
    const cache = themeTableSidecarBrowserFetchCache();
    const url = `${stockRevenueUrl(dataBaseUrl, ticker)}?${q}`;
    const res = await fetch(url, { credentials: "omit", cache });
    if (res.status === 404) return { status: "absent" };
    if (!res.ok) throw new Error(`stock revenue ${res.status}`);
    const parsed = parseStockRevenue(await res.text());
    return stockRevenueHasContent(parsed) && parsed
      ? { status: "ok", data: parsed }
      : { status: "absent" };
  })()
    .then((next) => {
      setThemeSidecarMemory(STOCK_REVENUE_CACHE_NS, key, next);
      return next;
    })
    .catch(() => {
      const next: StockRevenueLoadState = { status: "error" };
      setThemeSidecarMemory(STOCK_REVENUE_CACHE_NS, key, next);
      return next;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function prefetchStockRevenueSidecar(
  ticker: string,
  dataBaseUrl: string,
): Promise<StockRevenueLoadState> {
  return loadStockRevenueSidecar(ticker, dataBaseUrl);
}
