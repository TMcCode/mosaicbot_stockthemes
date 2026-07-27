"use client";

import { useMemo } from "react";

import {
  HomeTrendingThemesTable,
  type HomeTrendingRow,
} from "@/components/HomeTrendingThemesTable";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { useSessionVisibleColumns } from "@/hooks/useSessionVisibleColumns";
import type { TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import { computePerfFromChartPerformance } from "@/lib/computeThemePerf";
import {
  homeTrendingListsMatch,
  mergeHomeTrendingCompareReturns,
  mergeLiveHomeTrendingRows,
} from "@/lib/mergeLiveCompareData";
import { resolveTrendingColumnOrder } from "@/lib/trendingCompareMetrics";
import type { HomeTrendingRowV0 } from "@/types/home_trending.v0";

type Props = {
  rows: HomeTrendingRow[];
  columns: string[];
  columnHelp: Record<string, string | undefined>;
  sortPeriod: TopMoverTickerPeriod;
};

export function HomeTrendingThemesTableLive({
  rows,
  columns,
  columnHelp,
  sortPeriod,
}: Props) {
  const { compareBundle, liveHomeTrending, liveSpyPerf } = useLiveCompareBundles(null, null);

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
    return withSpy;
  }, [baseRows, compareBundle?.rows, liveSpyPerf]);
  const fullColumns = useMemo(() => {
    const fromRows = resolveTrendingColumnOrder(liveRows);
    const resolved = fromRows.length > 0 ? fromRows : columns;
    return resolved.filter((col) => col !== "LstRpt %" && col !== "SinceLstRpt");
  }, [liveRows, columns]);
  const visibleColumns = useSessionVisibleColumns(fullColumns);
  const visibleColumnHelp = useMemo(
    () =>
      Object.fromEntries(
        visibleColumns.map((col) => [col, columnHelp[col]]),
      ) as Record<string, string | undefined>,
    [visibleColumns, columnHelp],
  );

  return (
    <HomeTrendingThemesTable
      rows={liveRows}
      columns={visibleColumns}
      columnHelp={visibleColumnHelp}
      defaultSortKey={sortPeriod}
    />
  );
}
