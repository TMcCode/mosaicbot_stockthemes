"use client";

import { useEffect, useMemo, useState } from "react";

import {
  parseCompareThemesJson,
  parseHomeTopMoversJson,
} from "@/lib/mergeLiveCompareData";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveCompareReturnsEnabled } from "@/lib/stockthemesClientConfig";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export function useLiveCompareBundles(
  serverCompare: CompareThemesV0 | null | undefined,
  serverTopMovers: HomeTopMoversV0 | null | undefined,
): {
  compareBundle: CompareThemesV0 | null | undefined;
  topMoversBundle: HomeTopMoversV0 | null | undefined;
  liveCompare: boolean;
} {
  const enabled = stockthemesLiveCompareReturnsEnabled();
  const base = stockthemesPublicDataBase();
  const [liveCompare, setLiveCompare] = useState<CompareThemesV0 | null>(null);
  const [liveTopMovers, setLiveTopMovers] = useState<HomeTopMoversV0 | null>(null);

  useEffect(() => {
    if (!enabled || !base) return;

    let cancelled = false;
    const refresh = async () => {
      const q = priceReturnsBrowserCacheBusterQuery();
      try {
        const [compareRaw, moversRaw] = await Promise.all([
          fetchJson(`${base}/compare_themes.v0.json?${q}`),
          fetchJson(`${base}/home_top_movers.v0.json?${q}`),
        ]);
        if (cancelled) return;
        const compare = parseCompareThemesJson(compareRaw);
        const movers = parseHomeTopMoversJson(moversRaw);
        if (compare) setLiveCompare(compare);
        if (movers) setLiveTopMovers(movers);
      } catch {
        /* keep server snapshot */
      }
    };

    refresh();
    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    const id = window.setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, base]);

  const compareBundle = useMemo(
    () => liveCompare ?? serverCompare,
    [liveCompare, serverCompare],
  );
  const topMoversBundle = useMemo(
    () => liveTopMovers ?? serverTopMovers,
    [liveTopMovers, serverTopMovers],
  );

  return { compareBundle, topMoversBundle, liveCompare: enabled && Boolean(liveCompare) };
}
