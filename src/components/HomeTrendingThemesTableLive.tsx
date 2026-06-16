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
  const { compareBundle } = useLiveCompareBundles(serverCompareBundle, null);
  const liveRows = useMemo(
    () => mergeHomeTrendingCompareReturns(rows, compareBundle?.rows ?? []),
    [rows, compareBundle?.rows],
  );
  return <HomeTrendingThemesTable rows={liveRows} columns={columns} columnHelp={columnHelp} />;
}
