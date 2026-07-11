"use client";

import { useMemo, useState } from "react";

import pageStyles from "@/app/page.module.css";
import { CompareSummaryPanel } from "@/components/CompareSummaryPanel";
import { CompareThemesTable } from "@/components/CompareThemesTable";
import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import {
  availableCompareSummaryPeriods,
  type CompareSummaryPeriod,
} from "@/lib/comparePeriodSummary";
import { filterCompareRows } from "@/lib/filterCompareRows";
import type { CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import { mergeComparePageRows } from "@/lib/mergeLiveCompareData";
import { withoutPremarketUnlessActive } from "@/lib/usMarketSession";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

import styles from "./ComparePageClient.module.css";

type Row = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  tickersPreview?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type Props = {
  eyebrow: string;
  benchmarkRows: CompareBenchmarkRow[];
  factorSpreadRows?: CompareBenchmarkRow[];
  rows: Row[];
  columns: string[];
  groupOptions: string[];
  yearOptions: string[];
  selectedDates?: ManifestSelectedDateV0[];
  serverCompareBundle?: CompareThemesV0 | null;
};

export function ComparePageClient({
  eyebrow,
  benchmarkRows,
  factorSpreadRows = [],
  rows,
  columns,
  groupOptions,
  yearOptions,
  selectedDates,
  serverCompareBundle,
}: Props) {
  const { compareBundle } = useLiveCompareBundles(serverCompareBundle, null);
  const visibleColumns = useMemo(() => withoutPremarketUnlessActive(columns), [columns]);
  const rowsWithLiveCompare = useMemo(
    () => mergeComparePageRows(rows, compareBundle?.rows ?? []),
    [rows, compareBundle?.rows],
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => [...groupOptions]);
  const [selectedYears, setSelectedYears] = useState<string[]>(() => [...yearOptions]);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [showFactorSpreads, setShowFactorSpreads] = useState(false);
  const availablePeriods = useMemo(
    () => availableCompareSummaryPeriods(visibleColumns),
    [visibleColumns],
  );
  const [summaryPeriod, setSummaryPeriod] = useState<CompareSummaryPeriod>(() => {
    if (availablePeriods.includes("10D")) return "10D";
    return availablePeriods[0] ?? "10D";
  });

  const filtered = useMemo(
    () =>
      filterCompareRows(rowsWithLiveCompare, {
        groupOptions,
        yearOptions,
        selectedGroups,
        selectedYears,
      }),
    [rowsWithLiveCompare, groupOptions, yearOptions, selectedGroups, selectedYears],
  );

  const tableBenchmarkRows = useMemo(() => {
    const out: CompareBenchmarkRow[] = [];
    if (showBenchmarks) out.push(...benchmarkRows);
    if (showFactorSpreads) out.push(...factorSpreadRows);
    return out;
  }, [showBenchmarks, benchmarkRows, showFactorSpreads, factorSpreadRows]);

  return (
    <>
      <div className={`${pageStyles.heroGrid} ${pageStyles.heroGridCompare}`}>
        <div className={`${pageStyles.heroMain} ${pageStyles.heroMainCompare}`}>
          <p className={pageStyles.eyebrow}>{eyebrow}</p>
          <h1>Theme returns table</h1>
          <p className={pageStyles.introLead}>
            Rank every theme by return across daily, calendar, and earnings horizons—plus custom
            date windows. Filter by group or vintage year; click a column to sort, shift-click for
            a secondary sort.
          </p>
          <p>
            {rows.length} themes · {visibleColumns.length} metrics
          </p>
          <div className={pageStyles.compareHeroFilters}>
            <CheckboxMultiSelectDropdown
              label="Groups"
              options={groupOptions}
              selected={selectedGroups}
              onChange={setSelectedGroups}
              emptyLabel="All groups"
              layout="inline"
            />
            <CheckboxMultiSelectDropdown
              label="Years"
              options={yearOptions}
              selected={selectedYears}
              onChange={setSelectedYears}
              emptyLabel="All years"
              layout="inline"
            />
            {benchmarkRows.length > 0 ? (
              <label className={styles.benchmarkToggle}>
                <input
                  type="checkbox"
                  checked={showBenchmarks}
                  onChange={(e) => setShowBenchmarks(e.target.checked)}
                />
                Sector ETFs
              </label>
            ) : null}
            {factorSpreadRows.length > 0 ? (
              <label className={styles.benchmarkToggle}>
                <input
                  type="checkbox"
                  checked={showFactorSpreads}
                  onChange={(e) => setShowFactorSpreads(e.target.checked)}
                />
                Factor Spreads
              </label>
            ) : null}
          </div>
        </div>
        <CompareSummaryPanel
          rows={filtered}
          period={summaryPeriod}
          onPeriodChange={setSummaryPeriod}
          availablePeriods={availablePeriods}
        />
      </div>
      <section className={`${pageStyles.section} ${pageStyles.compareSectionTight}`}>
        <CompareThemesTable
          benchmarkRows={tableBenchmarkRows}
          rows={filtered}
          columns={visibleColumns}
          selectedDates={selectedDates}
        />
      </section>
    </>
  );
}
