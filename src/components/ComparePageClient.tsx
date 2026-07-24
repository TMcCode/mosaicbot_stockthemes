"use client";

import { useEffect, useMemo, useState } from "react";

import pageStyles from "@/app/page.module.css";
import { CompareSummaryPanel } from "@/components/CompareSummaryPanel";
import { CompareThemesTable } from "@/components/CompareThemesTable";
import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { useLazyCompareGroups } from "@/hooks/useCompareReturnsData";
import {
  availableCompareSummaryPeriods,
  type CompareSummaryPeriod,
} from "@/lib/comparePeriodSummary";
import {
  isCompareSectorFilterInactive,
  normalizeCompareSpySector,
  resolveVisibleSelectedGroups,
  COMPARE_SECTOR_UNMAPPED,
} from "@/lib/compareSectorFilter";
import { filterCompareRows } from "@/lib/filterCompareRows";
import type { CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import { mergeComparePageRows } from "@/lib/mergeLiveCompareData";
import { withoutPremarketUnlessActive } from "@/lib/usMarketSession";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

import styles from "./ComparePageClient.module.css";

type Row = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  spySector?: string | null;
  tickersPreview?: string | null;
  themeCount?: number | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type ViewMode = "themes" | "groups";

type Props = {
  eyebrow: string;
  benchmarkRows: CompareBenchmarkRow[];
  factorSpreadRows?: CompareBenchmarkRow[];
  rows: Row[];
  columns: string[];
  groupOptions: string[];
  /** Group display name → normalized spy_sector (Other / Unmapped / …). */
  groupSectorByName: Record<string, string>;
  sectorOptions: string[];
  yearOptions: string[];
  selectedDates?: ManifestSelectedDateV0[];
};

export function ComparePageClient({
  eyebrow,
  benchmarkRows,
  factorSpreadRows = [],
  rows,
  columns,
  groupOptions,
  groupSectorByName,
  sectorOptions,
  yearOptions,
  selectedDates,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("themes");
  const {
    compareBundle: liveCompareBundle,
    compareLoading: themesLoading,
    compareFailed: themesFailed,
  } = useLiveCompareBundles(null, null);
  const {
    bundle: groupBundle,
    loading: groupsLoading,
    failed: groupsFailed,
  } = useLazyCompareGroups(viewMode === "groups");
  const visibleColumns = useMemo(
    () => withoutPremarketUnlessActive(columns),
    [columns],
  );
  const rowsWithLiveCompare = useMemo(
    () => mergeComparePageRows(rows, liveCompareBundle?.rows ?? []),
    [rows, liveCompareBundle?.rows],
  );
  const groupRows = useMemo<Row[]>(
    () =>
      (groupBundle?.rows ?? []).map((row) => ({
        slug: String(row.slug || "").trim(),
        name: String(row.name || "").trim(),
        spySector: normalizeCompareSpySector(row.spy_sector),
        themeCount: row.theme_count ?? null,
        compareReturns: row.compare_returns ?? null,
      })),
    [groupBundle?.rows],
  );
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => [...sectorOptions]);
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

  useEffect(() => {
    const applyUrlView = () => {
      const value = new URLSearchParams(window.location.search).get("view");
      setViewMode(value === "groups" ? "groups" : "themes");
    };
    applyUrlView();
    window.addEventListener("popstate", applyUrlView);
    return () => window.removeEventListener("popstate", applyUrlView);
  }, []);

  const selectView = (next: ViewMode) => {
    setViewMode(next);
    const url = new URL(window.location.href);
    if (next === "groups") url.searchParams.set("view", "groups");
    else url.searchParams.delete("view");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const sectorInactive = isCompareSectorFilterInactive(selectedSectors, sectorOptions);

  const visibleGroupOptions = useMemo(() => {
    if (sectorInactive) return groupOptions;
    const allowed = new Set(selectedSectors);
    return groupOptions.filter(
      (name) => allowed.has(groupSectorByName[name] ?? COMPARE_SECTOR_UNMAPPED),
    );
  }, [sectorInactive, groupOptions, selectedSectors, groupSectorByName]);

  const visibleSelectedGroups = useMemo(
    () => resolveVisibleSelectedGroups(selectedGroups, visibleGroupOptions),
    [selectedGroups, visibleGroupOptions],
  );

  const filteredThemes = useMemo(
    () =>
      filterCompareRows(rowsWithLiveCompare, {
        groupOptions: visibleGroupOptions,
        yearOptions,
        sectorOptions,
        selectedGroups: visibleSelectedGroups,
        selectedYears,
        selectedSectors,
      }),
    [
      rowsWithLiveCompare,
      visibleGroupOptions,
      yearOptions,
      sectorOptions,
      visibleSelectedGroups,
      selectedYears,
      selectedSectors,
    ],
  );
  const filteredGroups = useMemo(
    () =>
      filterCompareRows(groupRows, {
        groupOptions: [],
        yearOptions: [],
        sectorOptions,
        selectedGroups: [],
        selectedYears: [],
        selectedSectors,
      }),
    [groupRows, sectorOptions, selectedSectors],
  );
  const filtered = viewMode === "groups" ? filteredGroups : filteredThemes;
  const totalRows = viewMode === "groups" ? groupRows.length : rows.length;
  const entityLabel = viewMode === "groups" ? "groups" : "themes";

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
            Rank every {viewMode === "groups" ? "group" : "theme"} by return across daily,
            calendar, and earnings horizons—plus custom date windows. Filter the universe; click a column to sort,
            shift-click for a secondary sort.
          </p>
          <div className={styles.metaRow}>
            <div className={styles.viewToggle} role="group" aria-label="Compare themes or groups">
              <button
                type="button"
                className={viewMode === "themes" ? styles.viewToggleActive : undefined}
                aria-pressed={viewMode === "themes"}
                onClick={() => selectView("themes")}
              >
                Themes
              </button>
              <button
                type="button"
                className={viewMode === "groups" ? styles.viewToggleActive : undefined}
                aria-pressed={viewMode === "groups"}
                onClick={() => selectView("groups")}
              >
                Groups
              </button>
            </div>
            <p className={styles.metaCount}>
              {viewMode === "groups" && groupsLoading && totalRows === 0
                ? "Loading groups"
                : filtered.length === totalRows
                  ? `${totalRows} ${entityLabel}`
                  : `${filtered.length} of ${totalRows} ${entityLabel}`}{" "}
              · {visibleColumns.length} metrics
            </p>
          </div>
          <div className={pageStyles.compareHeroFilters}>
            {sectorOptions.length > 0 ? (
              <CheckboxMultiSelectDropdown
                label="Sectors"
                options={sectorOptions}
                selected={selectedSectors}
                onChange={setSelectedSectors}
                emptyLabel="All sectors"
                layout="inline"
              />
            ) : null}
            {viewMode === "themes" ? (
              <>
                <CheckboxMultiSelectDropdown
                  label="Groups"
                  options={visibleGroupOptions}
                  selected={visibleSelectedGroups}
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
              </>
            ) : null}
          </div>
        </div>
        {viewMode === "groups" || liveCompareBundle ? (
          <CompareSummaryPanel
            rows={filtered}
            period={summaryPeriod}
            onPeriodChange={setSummaryPeriod}
            availablePeriods={availablePeriods}
            entityKind={viewMode === "groups" ? "group" : "theme"}
          />
        ) : (
          <p className={pageStyles.muted}>
            {themesFailed ? "Theme returns are temporarily unavailable." : "Loading theme returns…"}
          </p>
        )}
      </div>
      <section className={pageStyles.compareSectionTight}>
        {viewMode === "groups" || liveCompareBundle ? (
          <CompareThemesTable
            benchmarkRows={tableBenchmarkRows}
            rows={filtered}
            columns={visibleColumns}
            selectedDates={selectedDates}
            entityKind={viewMode === "groups" ? "group" : "theme"}
            toolbarStart={
              benchmarkRows.length > 0 || factorSpreadRows.length > 0 ? (
                <div className={styles.referenceToggles}>
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
              ) : null
            }
          />
        ) : (
          <p className={pageStyles.muted} aria-live="polite">
            {themesFailed && !themesLoading
              ? "Theme returns are temporarily unavailable."
              : "Loading the latest theme returns…"}
          </p>
        )}
        {viewMode === "groups" && groupsFailed && groupRows.length === 0 ? (
          <p className={styles.loadError}>Group returns are temporarily unavailable.</p>
        ) : null}
      </section>
    </>
  );
}
