"use client";

import { useMemo } from "react";

import {
  HomeTrendingThemesTable,
  type HomeTrendingRow,
} from "@/components/HomeTrendingThemesTable";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { mergeHomeTrendingCompareReturns } from "@/lib/mergeLiveCompareData";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";

type Props = {
  rows: HomeTrendingRow[];
  columns: string[];
  columnHelp: Record<string, string | undefined>;
  serverCompareBundle?: CompareThemesV0 | null;
};

export function HomeTrendingThemesTableLive({
  rows,
  columns,
  columnHelp,
  serverCompareBundle,
}: Props) {
  const { compareBundle, liveSpyPerf } = useLiveCompareBundles(serverCompareBundle, null);
  const liveRows = useMemo(() => {
    const merged = mergeHomeTrendingCompareReturns(rows, compareBundle?.rows ?? []);
    if (!liveSpyPerf?.compareReturns) return merged;
    return merged.map((row) =>
      row.marketBaseline
        ? {
            ...row,
            compare_returns: liveSpyPerf.compareReturns,
            chartPerf: liveSpyPerf.chartPerf,
          }
        : row,
    );
  }, [rows, compareBundle?.rows, liveSpyPerf]);
  return <HomeTrendingThemesTable rows={liveRows} columns={columns} columnHelp={columnHelp} />;
}
