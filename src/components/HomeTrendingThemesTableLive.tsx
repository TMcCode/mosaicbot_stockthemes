"use client";

import { useMemo } from "react";

import {
  HomeTrendingThemesTable,
  type HomeTrendingRow,
} from "@/components/HomeTrendingThemesTable";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import type { TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import { computePerfFromChartPerformance } from "@/lib/computeThemePerf";
import {
  homeTrendingListsMatch,
  mergeHomeTrendingCompareReturns,
  mergeLiveHomeTrendingRows,
} from "@/lib/mergeLiveCompareData";
import { sortHomeTrendingRows } from "@/lib/sortHomeTrendingRows";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeTrendingRowV0 } from "@/types/home_trending.v0";

type Props = {
  rows: HomeTrendingRow[];
  columns: string[];
  columnHelp: Record<string, string | undefined>;
  sortPeriod: TopMoverTickerPeriod;
  serverCompareBundle?: CompareThemesV0 | null;
};

export function HomeTrendingThemesTableLive({
  rows,
  columns,
  columnHelp,
  sortPeriod,
  serverCompareBundle,
}: Props) {
  const { compareBundle, liveHomeTrending, liveSpyPerf } = useLiveCompareBundles(serverCompareBundle, null);

  const baseRows = useMemo(() => {
    if (!liveHomeTrending || homeTrendingListsMatch(rows, liveHomeTrending)) {
      return rows;
    }
    return mergeLiveHomeTrendingRows(rows, liveHomeTrending, (row: HomeTrendingRowV0): HomeTrendingRow => ({
      slug: row.slug ?? null,
      name: row.name,
      chartPerf: computePerfFromChartPerformance(row.chart_1y?.performance),
      compare_returns: row.compare_returns ?? undefined,
    }));
  }, [rows, liveHomeTrending]);

  const liveRows = useMemo(() => {
    const merged = mergeHomeTrendingCompareReturns(baseRows, compareBundle?.rows ?? []);
    const withSpy = !liveSpyPerf?.compareReturns
      ? merged
      : merged.map((row) =>
          row.marketBaseline
            ? {
                ...row,
                compare_returns: liveSpyPerf.compareReturns,
                chartPerf: liveSpyPerf.chartPerf,
              }
            : row,
        );
    return sortHomeTrendingRows(withSpy, sortPeriod);
  }, [baseRows, compareBundle?.rows, liveSpyPerf, sortPeriod]);
  return <HomeTrendingThemesTable rows={liveRows} columns={columns} columnHelp={columnHelp} />;
}
