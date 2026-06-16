"use client";

import { useMemo } from "react";

import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import { useLiveThemeDetailPrices } from "@/hooks/useLiveThemeDetailPrices";
import {
  buildConstituentTreemapNodes,
  pickDefaultTreemapPeriod,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import { formatTickerPerformanceAsOf } from "@/lib/formatSiteDataPublished";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type Props = {
  slug: string;
  dataBaseUrl: string;
  serverDetail: ThemeDetailV0;
  themeName: string;
  defaultReturnPeriod?: TreemapReturnColumn;
};

export function ThemeHeroTreemapLive({
  slug,
  dataBaseUrl,
  serverDetail,
  themeName,
  defaultReturnPeriod,
}: Props) {
  const { detail } = useLiveThemeDetailPrices(slug, dataBaseUrl, serverDetail);
  const nodes = useMemo(() => buildConstituentTreemapNodes(detail.constituents), [detail.constituents]);
  if (!nodes.length) return null;

  return (
    <ThemeHeroTreemap
      nodes={nodes}
      themeName={themeName}
      defaultReturnPeriod={defaultReturnPeriod ?? pickDefaultTreemapPeriod(nodes)}
      asOfLabel={
        detail.ticker_performance_as_of
          ? formatTickerPerformanceAsOf(detail.ticker_performance_as_of)
          : undefined
      }
    />
  );
}
