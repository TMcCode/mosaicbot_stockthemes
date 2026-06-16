"use client";

import { useMemo } from "react";

import { HomeTopMoversTicker } from "@/components/HomeTopMoversTicker";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { pickTopMoversWithLiveBundle } from "@/lib/mergeLiveCompareData";
import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

type Props = {
  items: TopMoverTickerItem[];
  period?: TopMoverTickerPeriod;
  asOfLabel?: string;
  serverTopMoversBundle?: HomeTopMoversV0 | null;
};

export function HomeTopMoversTickerLive({
  items,
  period,
  asOfLabel,
  serverTopMoversBundle,
}: Props) {
  const { topMoversBundle } = useLiveCompareBundles(null, serverTopMoversBundle);
  const liveItems = useMemo(() => {
    if (!period) return items;
    const fromBundle = pickTopMoversWithLiveBundle(serverTopMoversBundle, topMoversBundle, period);
    return fromBundle.length > 0 ? fromBundle : items;
  }, [items, period, serverTopMoversBundle, topMoversBundle]);

  return <HomeTopMoversTicker items={liveItems} period={period} asOfLabel={asOfLabel} />;
}
