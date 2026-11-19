"use client";

import { useEffect, useState } from "react";

import {
  priceReturnsBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ThemeRank10dV0 } from "@/types/theme.detail.v0";

/** Shape of `rank_10d.v0.json` (published by MosaicBot on every compare publish). */
export type LiveRank10dPayload = {
  as_of?: string;
  themes?: Record<string, ThemeRank10dV0>;
  groups?: Record<string, ThemeRank10dV0>;
};

/** One fetch per page load; shared across chips on the same page. */
let loadPromise: Promise<LiveRank10dPayload | null> | null = null;

function loadLiveRank10d(): Promise<LiveRank10dPayload | null> {
  if (loadPromise) return loadPromise;
  const base = stockthemesPublicDataBase();
  if (!base) return Promise.resolve(null);
  loadPromise = fetch(`${base}/rank_10d.v0.json?${priceReturnsBrowserCacheBusterQuery()}`, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
  })
    .then((res) => (res.ok ? (res.json() as Promise<LiveRank10dPayload>) : null))
    .then((json) => (json && typeof json === "object" ? json : null))
    .catch(() => null);
  return loadPromise;
}

/** Max wait before showing the build-time rank if the live file is slow. */
const LIVE_RANK_TIMEOUT_MS = 1500;

/**
 * Live 10D rank sidecar. The fetch starts right after hydration (the rank chips stay
 * hidden until it settles, so it is on the visible path — the file is small).
 *
 * `payload` is null if the file is unavailable; callers fall back to the build-time rank.
 * `settled` flips true once the fetch finishes (success or failure), or after a short
 * timeout — callers reveal the chips then, so a stale number is never shown and flipped.
 */
export function useLiveRank10d(): { payload: LiveRank10dPayload | null; settled: boolean } {
  const [payload, setPayload] = useState<LiveRank10dPayload | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setSettled(true);
    }, LIVE_RANK_TIMEOUT_MS);
    void loadLiveRank10d().then((next) => {
      if (cancelled) return;
      if (next) setPayload(next);
      setSettled(true);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { payload, settled };
}
