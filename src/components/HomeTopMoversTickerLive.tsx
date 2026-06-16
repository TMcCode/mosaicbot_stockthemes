"use client";

import { useMemo } from "react";

import { HomeTopMoversTicker } from "@/components/HomeTopMoversTicker";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { pickTopMoversWithLiveBundle } from "@/lib/mergeLiveCompareData";
import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

type Props = {
  items: TopMoverTickerItem[];
  period?: TopMoverTickerPeriod;
  asOfLabel?: string;
  tickerPerformanceAsOf?: string;
  serverTopMoversBundle?: HomeTopMoversV0 | null;
};

export function HomeTopMoversTickerLive({
  items,
  period,
  asOfLabel,
  tickerPerformanceAsOf,
  serverTopMoversBundle,
}: Props) {
  const { topMoversBundle, liveTickerPerformanceAsOf } = useLiveCompareBundles(
    null,
    serverTopMoversBundle,
  );
  const liveItems = useMemo(() => {
    if (!period) return items;
    const fromBundle = pickTopMoversWithLiveBundle(serverTopMoversBundle, topMoversBundle, period);
    return fromBundle.length > 0 ? fromBundle : items;
  }, [items, period, serverTopMoversBundle, topMoversBundle]);

  const liveAsOfLabel = useMemo(() => {
    const iso =
      topMoversBundle?.as_of ??
      serverTopMoversBundle?.as_of ??
      liveTickerPerformanceAsOf ??
      tickerPerformanceAsOf;
    return iso ? formatSiteDataPublished(iso) : asOfLabel;
  }, [
    asOfLabel,
    liveTickerPerformanceAsOf,
    serverTopMoversBundle?.as_of,
    tickerPerformanceAsOf,
    topMoversBundle?.as_of,
  ]);

  return (
    <HomeTopMoversTicker items={liveItems} period={period} asOfLabel={liveAsOfLabel} />
  );
}
