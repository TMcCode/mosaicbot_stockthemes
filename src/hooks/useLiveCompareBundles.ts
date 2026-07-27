"use client";

import { useMemo, useSyncExternalStore } from "react";

import { parseCompareThemesJson } from "@/lib/mergeLiveCompareData";
import { parseSpySnapshotJson } from "@/lib/parseSpySnapshot";
import type { SpyMarketPerf } from "@/lib/parseSpySnapshot";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveCompareReturnsEnabled } from "@/lib/stockthemesClientConfig";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeTrendingV0 } from "@/types/home_trending.v0";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
    ...init,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

type LiveCompareSnapshot = {
  liveCompare: CompareThemesV0 | null;
  liveSpyPerf: SpyMarketPerf | null;
  compareLoading: boolean;
  compareFailed: boolean;
};

const EMPTY_SNAPSHOT: LiveCompareSnapshot = {
  liveCompare: null,
  liveSpyPerf: null,
  compareLoading: false,
  compareFailed: false,
};

let snapshot = EMPTY_SNAPSHOT;
let refreshPromise: Promise<void> | null = null;
let intervalId: number | null = null;
const listeners = new Set<() => void>();

function emit(next: LiveCompareSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function refreshLiveBundles(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  const base = stockthemesPublicDataBase();
  if (!base) return Promise.resolve();

  refreshPromise = (async () => {
    const q = priceReturnsBrowserCacheBusterQuery();
    // Spy Premarket/Postmarket can land between theme compare ticks; never reuse a
    // stale browser/CDN response for the compact SPY snapshot within a 15m bucket.
    const spyQ = `ts=${Date.now()}`;
    emit({ ...snapshot, compareLoading: true, compareFailed: false });
    try {
      const [compareRaw, spyRaw] = await Promise.all([
        fetchJson(`${base}/compare_themes.v0.json?${q}`),
        fetchJson(`${base}/spy_snapshot.v0.json?${spyQ}`, { cache: "no-store" }),
      ]);
      const compare = parseCompareThemesJson(compareRaw);
      const spy = parseSpySnapshotJson(spyRaw);
      emit({
        liveCompare: compare ?? snapshot.liveCompare,
        liveSpyPerf: spy ?? snapshot.liveSpyPerf,
        compareLoading: false,
        compareFailed: !compare && !snapshot.liveCompare,
      });
    } catch {
      emit({ ...snapshot, compareLoading: false, compareFailed: !snapshot.liveCompare });
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && stockthemesPublicDataBase()) {
    void refreshLiveBundles();
    if (stockthemesLiveCompareReturnsEnabled()) {
      intervalId = window.setInterval(
        () => void refreshLiveBundles(),
        priceReturnsRevalidateSeconds() * 1000,
      );
    }
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function useLiveCompareBundles(
  serverCompare: CompareThemesV0 | null | undefined,
  serverTopMovers: HomeTopMoversV0 | null | undefined,
): {
  compareBundle: CompareThemesV0 | null | undefined;
  topMoversBundle: HomeTopMoversV0 | null | undefined;
  liveHomeTrending: HomeTrendingV0 | null;
  liveSpyPerf: SpyMarketPerf | null;
  liveTickerPerformanceAsOf: string | null;
  liveCompare: boolean;
  compareLoading: boolean;
  compareFailed: boolean;
} {
  const enabled = stockthemesLiveCompareReturnsEnabled();
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const compareBundle = useMemo(
    () => live.liveCompare ?? serverCompare,
    [live.liveCompare, serverCompare],
  );
  const topMoversBundle = useMemo(
    () => serverTopMovers,
    [serverTopMovers],
  );

  return {
    compareBundle,
    topMoversBundle,
    liveHomeTrending: null,
    liveSpyPerf: live.liveSpyPerf,
    liveTickerPerformanceAsOf: live.liveCompare?.as_of ?? null,
    liveCompare: enabled && Boolean(live.liveCompare),
    compareLoading: live.compareLoading,
    compareFailed: live.compareFailed,
  };
}
