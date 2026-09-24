"use client";

import { useMemo } from "react";

import { HomeTopMoversTicker } from "@/components/HomeTopMoversTicker";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { pickTopMoversWithLiveBundle } from "@/lib/mergeLiveCompareData";
import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

type Props = {
  items: TopMoverTickerItem[];
  period?: TopMoverTickerPeriod;
  asOfLabel?: string;
  tickerPerformanceAsOf?: string;
  /** SSR compare — when fresh, skips immediate ~1MB client refetch. */
  serverCompare?: CompareThemesV0 | null;
  serverTopMovers?: HomeTopMoversV0 | null;
};

export function HomeTopMoversTickerLive({
  items,
  period,
  asOfLabel,
  tickerPerformanceAsOf,
  serverCompare = null,
  serverTopMovers = null,
}: Props) {
  const { topMoversBundle, compareBundle, liveTickerPerformanceAsOf } = useLiveCompareBundles(
    serverCompare,
    serverTopMovers,
  );
  const liveItems = useMemo(() => {
    if (!period) return items;
    const fromBundle = pickTopMoversWithLiveBundle(
      null,
      topMoversBundle,
      period,
      compareBundle,
    );
    return fromBundle.length > 0 ? fromBundle : items;
  }, [items, period, topMoversBundle, compareBundle]);

  const liveAsOfLabel = useMemo(() => {
    const iso =
      topMoversBundle?.as_of ??
      liveTickerPerformanceAsOf ??
      tickerPerformanceAsOf;
    return iso ? formatSiteDataPublished(iso) : asOfLabel;
  }, [
    asOfLabel,
    liveTickerPerformanceAsOf,
    tickerPerformanceAsOf,
    topMoversBundle?.as_of,
  ]);

  return (
    <HomeTopMoversTicker items={liveItems} period={period} asOfLabel={liveAsOfLabel} />
  );
}
