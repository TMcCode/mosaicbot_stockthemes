"use client";

import { useMemo } from "react";

import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { overlayStockThemesWithLiveCompare } from "@/lib/stockThemeLiveBlend";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/**
 * Membership themes with `compare_returns` refreshed from the live `compare_themes` bundle
 * (same store as home / compare pages). The ETL no longer rewrites every stock's `.app`
 * file each price tick, so stock pages overlay live theme returns here.
 */
export function useLiveStockThemes<
  T extends { slug: string; compare_returns?: ThemeCompareReturnsV0 | null },
>(themes: T[]): { themes: T[]; liveCompare: boolean } {
  const { compareBundle, liveCompare } = useLiveCompareBundles(null, null);
  const rows = liveCompare ? compareBundle?.rows : null;
  const live = useMemo(() => overlayStockThemesWithLiveCompare(themes, rows), [themes, rows]);
  return { themes: live, liveCompare };
}
