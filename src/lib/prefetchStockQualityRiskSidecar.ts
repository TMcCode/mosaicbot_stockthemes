"use client";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import {
  parseStockQualityRisk,
  stockQualityRiskHasContent,
  stockQualityRiskUrl,
} from "@/lib/stockQualityRisk";
import {
  themeTableSidecarBrowserCacheBusterQuery,
  themeTableSidecarBrowserFetchCache,
} from "@/lib/themeTableSidecarFetch";
import type { StockQualityRiskV0 } from "@/types/stock.quality_risk.v0";

export const STOCK_QUALITY_RISK_CACHE_NS = "stock-quality-risk";

export type StockQualityRiskLoadState =
  | { status: "absent" }
  | { status: "ok"; data: StockQualityRiskV0 }
  | { status: "error" };

const inflight = new Map<string, Promise<StockQualityRiskLoadState>>();

export function loadStockQualityRiskSidecar(
  ticker: string,
  dataBaseUrl: string,
): Promise<StockQualityRiskLoadState> {
  const key = themeSidecarCacheKey(dataBaseUrl, ticker.toUpperCase());
  const cached = getThemeSidecarMemory<StockQualityRiskLoadState>(STOCK_QUALITY_RISK_CACHE_NS, key);
  if (cached && isThemeSidecarTerminalStatus(cached.status)) {
    return Promise.resolve(cached);
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<StockQualityRiskLoadState> => {
    const q = themeTableSidecarBrowserCacheBusterQuery();
    const cache = themeTableSidecarBrowserFetchCache();
    const url = `${stockQualityRiskUrl(dataBaseUrl, ticker)}?${q}`;
    const res = await fetch(url, { credentials: "omit", cache });
    if (res.status === 404) return { status: "absent" };
    if (!res.ok) throw new Error(`stock quality_risk ${res.status}`);
    const parsed = parseStockQualityRisk(await res.text());
    return stockQualityRiskHasContent(parsed) && parsed
      ? { status: "ok", data: parsed }
      : { status: "absent" };
  })()
    .then((next) => {
      setThemeSidecarMemory(STOCK_QUALITY_RISK_CACHE_NS, key, next);
      return next;
    })
    .catch(() => {
      const next: StockQualityRiskLoadState = { status: "error" };
      setThemeSidecarMemory(STOCK_QUALITY_RISK_CACHE_NS, key, next);
      return next;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function prefetchStockQualityRiskSidecar(
  ticker: string,
  dataBaseUrl: string,
): Promise<StockQualityRiskLoadState> {
  return loadStockQualityRiskSidecar(ticker, dataBaseUrl);
}
