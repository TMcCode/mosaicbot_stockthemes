"use client";

import { useMemo } from "react";

import { GroupThemesTable } from "@/components/GroupThemesTable";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { mergeGroupThemeTableCompareReturns } from "@/lib/mergeLiveCompareData";
import { resolveGroupThemesMetricColumns, type GroupThemeTableRow } from "@/lib/groupThemesTable";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

type Props = {
  rows: GroupThemeTableRow[];
  metricColumns: string[];
  selectedDates?: ManifestSelectedDateV0[];
};

export function GroupThemesTableLive({
  rows,
  metricColumns,
  selectedDates,
}: Props) {
  const { compareBundle } = useLiveCompareBundles(null, null);
  const liveRows = useMemo(
    () => mergeGroupThemeTableCompareReturns(rows, compareBundle?.rows ?? []),
    [rows, compareBundle?.rows],
  );
  const liveMetricColumns = useMemo(() => resolveGroupThemesMetricColumns(liveRows), [liveRows]);
  const metricColumnsResolved =
    liveMetricColumns.length > 0 ? liveMetricColumns : metricColumns;
  return (
    <GroupThemesTable
      rows={liveRows}
      metricColumns={metricColumnsResolved}
      selectedDates={selectedDates}
    />
  );
}
