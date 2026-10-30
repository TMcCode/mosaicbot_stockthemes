"use client";

import { useEffect, useState } from "react";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import {
  loadStockQualityRiskSidecar,
  STOCK_QUALITY_RISK_CACHE_NS,
} from "@/lib/prefetchStockQualityRiskSidecar";
import type { StockQualityRiskV0 } from "@/types/stock.quality_risk.v0";

export type StockQualityRiskSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: StockQualityRiskV0 }
  | { status: "error" };

function initialState(
  ticker: string | undefined,
  dataBaseUrl: string | undefined,
): StockQualityRiskSidecarState {
  if (ticker && dataBaseUrl) {
    const cached = getThemeSidecarMemory<StockQualityRiskSidecarState>(
      STOCK_QUALITY_RISK_CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, ticker.toUpperCase()),
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) return cached;
  }
  return { status: "idle" };
}

export function useStockQualityRiskSidecar(
  ticker: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): StockQualityRiskSidecarState {
  const [state, setState] = useState<StockQualityRiskSidecarState>(() =>
    initialState(ticker, dataBaseUrl),
  );

  useEffect(() => {
    if (!enabled) return;
    if (!ticker || !dataBaseUrl) {
      setState({ status: "absent" });
      return;
    }

    const key = themeSidecarCacheKey(dataBaseUrl, ticker.toUpperCase());
    const cached = getThemeSidecarMemory<StockQualityRiskSidecarState>(
      STOCK_QUALITY_RISK_CACHE_NS,
      key,
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void loadStockQualityRiskSidecar(ticker, dataBaseUrl).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ticker, dataBaseUrl, enabled]);

  return state;
}
