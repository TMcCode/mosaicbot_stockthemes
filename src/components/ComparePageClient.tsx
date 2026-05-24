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
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

type Row = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type Props = {
  eyebrow: string;
  rows: Row[];
  columns: string[];
  groupOptions: string[];
  yearOptions: string[];
};

export function ComparePageClient({
  eyebrow,
  rows,
  columns,
  groupOptions,
  yearOptions,
}: Props) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => [...groupOptions]);
  const [selectedYears, setSelectedYears] = useState<string[]>(() => [...yearOptions]);
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
          <h1>Compare all themes</h1>
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
        <CompareThemesTable rows={filtered} columns={columns} />
      </section>
    </>
  );
}
