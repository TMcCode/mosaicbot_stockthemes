"use client";

import { useMemo } from "react";

import { GroupThemesTable } from "@/components/GroupThemesTable";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { mergeGroupThemeTableCompareReturns } from "@/lib/mergeLiveCompareData";
import type { GroupThemeTableRow } from "@/lib/groupThemesTable";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

type Props = {
  rows: GroupThemeTableRow[];
  metricColumns: string[];
  selectedDates?: ManifestSelectedDateV0[];
  serverCompareBundle?: CompareThemesV0 | null;
};

export function GroupThemesTableLive({
  rows,
  metricColumns,
  selectedDates,
  serverCompareBundle,
}: Props) {
  const { compareBundle } = useLiveCompareBundles(serverCompareBundle, null);
  const liveRows = useMemo(
    () => mergeGroupThemeTableCompareReturns(rows, compareBundle?.rows ?? []),
    [rows, compareBundle?.rows],
  );
  return (
    <GroupThemesTable rows={liveRows} metricColumns={metricColumns} selectedDates={selectedDates} />
  );
}
