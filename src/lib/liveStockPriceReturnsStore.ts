import { stockTierBUrl } from "@/lib/stockTierB";
import type { ConstituentPriceReturnsV0 } from "@/types/theme.detail.v0";
import {
  STOCK_PRICE_RETURNS_SIDECAR_SUFFIX,
  type StockPriceReturnsSidecarV0,
} from "@/types/stock.price_returns.v0";

export type LiveStockPriceReturns = {
  priceReturns: ConstituentPriceReturnsV0;
  asOf?: string;
  tickerPerformanceAsOf?: string;
};

type Entry = {
  merged: LiveStockPriceReturns;
  fetchedAtMs: number;
};

type Listener = () => void;

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<Listener>>();
const inflight = new Map<string, Promise<LiveStockPriceReturns>>();

export function liveStockPriceReturnsCacheKey(ticker: string, dataBaseUrl: string): string {
  return `${dataBaseUrl}::stock::${ticker}`;
}

function notify(key: string) {
  for (const listener of listeners.get(key) || []) {
    listener();
  }
}

export function subscribeLiveStockPriceReturns(key: string, listener: Listener): () => void {
  const set = listeners.get(key) || new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    const current = listeners.get(key);
    if (!current) return;
    current.delete(listener);
    if (!current.size) listeners.delete(key);
  };
}

export function getLiveStockPriceReturnsEntry(key: string): Entry | undefined {
  return entries.get(key);
}

export function seedLiveStockPriceReturns(
  key: string,
  server: LiveStockPriceReturns | null | undefined,
): void {
  if (!server?.priceReturns) return;
  if (entries.has(key)) return;
  entries.set(key, { merged: server, fetchedAtMs: 0 });
  notify(key);
}

export function parseStockPriceReturnsSidecar(raw: unknown): StockPriceReturnsSidecarV0 {
  const data = raw as StockPriceReturnsSidecarV0;
  if (data.schema_version !== "stock.price_returns.v0") {
    throw new Error(`Unsupported stock price returns schema_version: ${data.schema_version}`);
  }
  if (!data.ticker || !data.price_returns || typeof data.price_returns !== "object") {
    throw new Error("Invalid stock price returns sidecar");
  }
  return data;
}

export async function refreshLiveStockPriceReturns({
  ticker,
  dataBaseUrl,
  server,
  fetchJson,
}: {
  ticker: string;
  dataBaseUrl: string;
  server: LiveStockPriceReturns | null | undefined;
  fetchJson: (url: string) => Promise<unknown>;
}): Promise<LiveStockPriceReturns> {
  const key = liveStockPriceReturnsCacheKey(ticker, dataBaseUrl);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const sidecar = parseStockPriceReturnsSidecar(
      await fetchJson(stockTierBUrl(dataBaseUrl, ticker, STOCK_PRICE_RETURNS_SIDECAR_SUFFIX)),
    );
    const merged: LiveStockPriceReturns = {
      priceReturns: sidecar.price_returns,
      asOf: sidecar.as_of,
      tickerPerformanceAsOf: sidecar.ticker_performance_as_of,
    };
    entries.set(key, { merged, fetchedAtMs: Date.now() });
    notify(key);
    return merged;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    const fallback = entries.get(key)?.merged ?? server;
    if (fallback) return fallback;
    throw err;
  }
}
