"use client";

import { useEffect, useState } from "react";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import {
  loadStockRevenueSidecar,
  STOCK_REVENUE_CACHE_NS,
} from "@/lib/prefetchStockRevenueSidecar";
import type { StockRevenueV0 } from "@/types/stock.revenue.v0";

export type StockRevenueSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: StockRevenueV0 }
  | { status: "error" };

function initialState(
  ticker: string | undefined,
  dataBaseUrl: string | undefined,
): StockRevenueSidecarState {
  if (ticker && dataBaseUrl) {
    const cached = getThemeSidecarMemory<StockRevenueSidecarState>(
      STOCK_REVENUE_CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, ticker.toUpperCase()),
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) return cached;
  }
  return { status: "idle" };
}

/** Lazy-fetch stock revenue sidecar once signed-in Revenue tab is opened. */
export function useStockRevenueSidecar(
  ticker: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): StockRevenueSidecarState {
  const [state, setState] = useState<StockRevenueSidecarState>(() =>
    initialState(ticker, dataBaseUrl),
  );

  useEffect(() => {
    if (!enabled) return;
    if (!ticker || !dataBaseUrl) {
      setState({ status: "absent" });
      return;
    }

    const key = themeSidecarCacheKey(dataBaseUrl, ticker.toUpperCase());
    const cached = getThemeSidecarMemory<StockRevenueSidecarState>(STOCK_REVENUE_CACHE_NS, key);
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void loadStockRevenueSidecar(ticker, dataBaseUrl).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ticker, dataBaseUrl, enabled]);

  return state;
}
