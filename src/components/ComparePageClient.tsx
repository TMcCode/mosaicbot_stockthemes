"use client";

import { useMemo, useState } from "react";

import pageStyles from "@/app/page.module.css";
import { CompareSummaryPanel } from "@/components/CompareSummaryPanel";
import { CompareThemesTable } from "@/components/CompareThemesTable";
import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import {
  availableCompareSummaryPeriods,
  type CompareSummaryPeriod,
} from "@/lib/comparePeriodSummary";
import { filterCompareRows } from "@/lib/filterCompareRows";
import type { CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
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
  rows: Row[];
  columns: string[];
  groupOptions: string[];
  yearOptions: string[];
  selectedDates?: ManifestSelectedDateV0[];
};

export function ComparePageClient({
  eyebrow,
  benchmarkRows,
  rows,
  columns,
  groupOptions,
  yearOptions,
  selectedDates,
}: Props) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => [...groupOptions]);
  const [selectedYears, setSelectedYears] = useState<string[]>(() => [...yearOptions]);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const availablePeriods = useMemo(() => availableCompareSummaryPeriods(columns), [columns]);
  const [summaryPeriod, setSummaryPeriod] = useState<CompareSummaryPeriod>(() => {
    if (availablePeriods.includes("10D")) return "10D";
    return availablePeriods[0] ?? "10D";
  });

  const filtered = useMemo(
    () =>
      filterCompareRows(rows, {
        groupOptions,
        yearOptions,
        selectedGroups,
        selectedYears,
      }),
    [rows, groupOptions, yearOptions, selectedGroups, selectedYears],
  );

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
            {rows.length} themes · {columns.length} metrics
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
          benchmarkRows={showBenchmarks ? benchmarkRows : []}
          rows={filtered}
          columns={columns}
          selectedDates={selectedDates}
        />
      </section>
    </>
  );
}
