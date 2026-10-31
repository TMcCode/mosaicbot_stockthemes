"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { StockPageRuntime } from "@/components/StockPageRuntime";
import { stockPagePath } from "@/lib/stockPagePath";

const SESSION_KEY = "st_ondemand_stock_ticker";

declare global {
  interface Window {
    __STOCKTHEMES_ONDEMAND_TICKER__?: string;
  }
}

function readTicker(searchParams: URLSearchParams): string {
  const fromQuery = (searchParams.get("ticker") || "").trim();
  if (fromQuery) return fromQuery;
  if (typeof window === "undefined") return "";
  const fromBoot = String(window.__STOCKTHEMES_ONDEMAND_TICKER__ || "").trim();
  if (fromBoot) return fromBoot;
  try {
    return (sessionStorage.getItem(SESSION_KEY) || "").trim();
  } catch {
    return "";
  }
}

/**
 * On-demand stock entry (`/stocks/__shell?ticker=` or Function-injected boot).
 * Pretty URL restored via history.replaceState after mount.
 */
export function StockShellClient() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(() => readTicker(searchParams));

  useEffect(() => {
    const next = readTicker(searchParams);
    if (next && next !== ticker) setTicker(next);
  }, [searchParams, ticker]);

  useEffect(() => {
    if (!ticker) return;
    try {
      sessionStorage.setItem(SESSION_KEY, ticker);
    } catch {
      /* ignore quota / private mode */
    }
    const pretty = stockPagePath(ticker);
    if (window.location.pathname !== pretty.split("?")[0]) {
      window.history.replaceState(null, "", pretty);
    }
  }, [ticker]);

  return <StockPageRuntime ticker={ticker} />;
}
