"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import pageStyles from "@/app/page.module.css";
import { CompareSummaryPanel } from "@/components/CompareSummaryPanel";
import { CompareColumnsDropdown } from "@/components/CompareColumnsDropdown";
import { CompareThemesTable } from "@/components/CompareThemesTable";
import { CheckboxMultiSelectDropdown } from "@/components/CheckboxMultiSelectDropdown";
import { useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useLiveCompareBundles } from "@/hooks/useLiveCompareBundles";
import { useSessionVisibleColumns } from "@/hooks/useSessionVisibleColumns";
import { useLazyCompareGroups } from "@/hooks/useCompareReturnsData";
import { useTopPicksSlugs } from "@/hooks/useTopPicksSlugs";
import {
  COMPARE_SUMMARY_DEFAULT_METRIC,
  isCompareNameSortKey,
  resolveCompareSummaryMetricColumn,
} from "@/lib/comparePeriodSummary";
import {
  resolveCompareDisplayColumns,
  type CompareColumnPrefs,
} from "@/lib/compareColumnPrefs";
import {
  isCompareSectorFilterInactive,
  normalizeCompareSpySector,
  resolveVisibleSelectedGroups,
  COMPARE_SECTOR_UNMAPPED,
} from "@/lib/compareSectorFilter";
import { filterCompareRows } from "@/lib/filterCompareRows";
import {
  filterRowsBySlugSet,
  resolveCompareWatchlistSlugFilter,
  toSlugSet,
} from "@/lib/filterCompareWatchlist";
import type { CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import { mergeComparePageRows } from "@/lib/mergeLiveCompareData";
import { isShortThemeName } from "@/lib/shortThemeChart";
import { isSupportingThemeRankVisibility } from "@/lib/supportingTheme";
import { resolveCompareColumnOrder } from "@/lib/trendingCompareMetrics";
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
  rank_visibility?: string | null;
  canonical_theme?: string | null;
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
  selectedDates,
}: Props) {
  const { user, showAuthedUi } = useOptionalSupabaseAuth();
  const watchlist = useWatchlist();
  const [viewMode, setViewMode] = useState<ViewMode>("themes");
  const [urlViewResolved, setUrlViewResolved] = useState(false);
  const {
    compareBundle: liveCompareBundle,
    compareLoading: themesLoading,
    compareFailed: themesFailed,
  } = useLiveCompareBundles(null, null, {
    enabled: urlViewResolved && viewMode === "themes",
  });
  const {
    bundle: groupBundle,
    loading: groupsLoading,
    failed: groupsFailed,
  } = useLazyCompareGroups(urlViewResolved && viewMode === "groups");
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
  const fullColumns = useMemo(() => {
    // Must use compare order (not trending) — trending strips LstRpt / SinceLstRpt / 3M.
    const activeRows = viewMode === "groups" ? groupRows : rowsWithLiveCompare;
    const bundleCols =
      viewMode === "groups"
        ? (groupBundle?.columns ?? liveCompareBundle?.columns ?? columns)
        : (liveCompareBundle?.columns ?? columns);
    return resolveCompareColumnOrder(
      activeRows.map((row) => ({
        compare_returns: row.compareReturns ?? undefined,
      })),
      bundleCols,
    );
  }, [
    viewMode,
    groupRows,
    rowsWithLiveCompare,
    groupBundle?.columns,
    liveCompareBundle?.columns,
    columns,
  ]);
  const sessionColumns = useSessionVisibleColumns(fullColumns);
  /** null = editorial default for this session; not persisted across visits. */
  const [columnPrefs, setColumnPrefs] = useState<CompareColumnPrefs | null>(null);
  const visibleColumns = useMemo(
    () => resolveCompareDisplayColumns(sessionColumns, columnPrefs),
    [sessionColumns, columnPrefs],
  );
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => [...sectorOptions]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => [...groupOptions]);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [showFactorSpreads, setShowFactorSpreads] = useState(false);
  const [excludeShort, setExcludeShort] = useState(false);
  const [excludeSupportingThemes, setExcludeSupportingThemes] = useState(true);
  const [myWatchlistOnly, setMyWatchlistOnly] = useState(false);
  const [topPicksOnly, setTopPicksOnly] = useState(false);
  const [urlSortKey, setUrlSortKey] = useState<string | null>(null);
  // Only fetch when Top Picks is on — never compete with compare_themes hydrate.
  const {
    themeSlugs: topPickThemeSlugs,
    groupSlugs: topPickGroupSlugs,
    ready: topPicksReady,
  } = useTopPicksSlugs(topPicksOnly);
  const topPickThemeSet = useMemo(() => toSlugSet(topPickThemeSlugs), [topPickThemeSlugs]);
  const topPickGroupSet = useMemo(() => toSlugSet(topPickGroupSlugs), [topPickGroupSlugs]);
  const signInHref = "/sign-in?next=%2Fcompare";
  const signedIn = Boolean(user) || showAuthedUi;
  const [primarySortKey, setPrimarySortKey] = useState(COMPARE_SUMMARY_DEFAULT_METRIC);
  const [lastMetricSortKey, setLastMetricSortKey] = useState(COMPARE_SUMMARY_DEFAULT_METRIC);

  const onPrimarySortKeyChange = useCallback((key: string) => {
    setPrimarySortKey(key);
    if (!isCompareNameSortKey(key)) {
      setLastMetricSortKey(key);
    }
  }, []);

  const summaryMetricColumn = useMemo(
    () =>
      resolveCompareSummaryMetricColumn(primarySortKey, lastMetricSortKey, visibleColumns),
    [primarySortKey, lastMetricSortKey, visibleColumns],
  );

  useEffect(() => {
    const truthy = (raw: string | null) => {
      const v = String(raw || "")
        .trim()
        .toLowerCase();
      return v === "1" || v === "true" || v === "yes";
    };
    const applyUrlParams = () => {
      const sp = new URLSearchParams(window.location.search);
      setViewMode(sp.get("view") === "groups" ? "groups" : "themes");
      setMyWatchlistOnly(truthy(sp.get("my")));
      setTopPicksOnly(truthy(sp.get("picks")));
      const sort = String(sp.get("sort") || "").trim();
      setUrlSortKey(sort || null);
      if (sort && !isCompareNameSortKey(sort)) {
        setPrimarySortKey(sort);
        setLastMetricSortKey(sort);
      }
      setUrlViewResolved(true);
    };
    applyUrlParams();
    window.addEventListener("popstate", applyUrlParams);
    return () => window.removeEventListener("popstate", applyUrlParams);
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

  const watchlistSlugFilter = useMemo(() => {
    // Guest + Mine only → empty set (prompt sign-in) instead of accidentally showing all rows.
    if (myWatchlistOnly && !signedIn && !topPicksOnly) {
      return new Set<string>();
    }
    return resolveCompareWatchlistSlugFilter({
      myWatchlist: myWatchlistOnly && signedIn,
      // Wait for fetch so an empty set doesn't flash "no matches".
      topPicks: topPicksOnly && topPicksReady,
      viewMode,
      myThemeSlugs: watchlist?.themeKeys ?? new Set(),
      topPickThemeSlugs: topPickThemeSet,
      topPickGroupSlugs: topPickGroupSet,
      themeRowsForGroupMembership: rowsWithLiveCompare,
    });
  }, [
    myWatchlistOnly,
    signedIn,
    topPicksOnly,
    topPicksReady,
    viewMode,
    watchlist?.themeKeys,
    topPickThemeSet,
    topPickGroupSet,
    rowsWithLiveCompare,
  ]);

  const filteredThemes = useMemo(() => {
    let base = filterCompareRows(rowsWithLiveCompare, {
      groupOptions: visibleGroupOptions,
      yearOptions: [],
      sectorOptions,
      selectedGroups: visibleSelectedGroups,
      selectedYears: [],
      selectedSectors,
    });
    if (excludeShort) {
      base = base.filter((row) => !isShortThemeName(row.name));
    }
    if (excludeSupportingThemes) {
      base = base.filter((row) => !isSupportingThemeRankVisibility(row.rank_visibility));
    }
    if (viewMode === "themes") {
      base = filterRowsBySlugSet(base, watchlistSlugFilter);
    }
    return base;
  }, [
    rowsWithLiveCompare,
    visibleGroupOptions,
    sectorOptions,
    visibleSelectedGroups,
    selectedSectors,
    excludeShort,
    excludeSupportingThemes,
    viewMode,
    watchlistSlugFilter,
  ]);
  const filteredGroups = useMemo(() => {
    let base = filterCompareRows(groupRows, {
      groupOptions: [],
      yearOptions: [],
      sectorOptions,
      selectedGroups: [],
      selectedYears: [],
      selectedSectors,
    });
    if (excludeShort) {
      base = base.filter((row) => !isShortThemeName(row.name));
    }
    if (viewMode === "groups") {
      base = filterRowsBySlugSet(base, watchlistSlugFilter);
    }
    return base;
  }, [groupRows, sectorOptions, selectedSectors, excludeShort, viewMode, watchlistSlugFilter]);
  const filtered = viewMode === "groups" ? filteredGroups : filteredThemes;
  const activeBundleReady =
    viewMode === "groups" ? Boolean(groupBundle) : Boolean(liveCompareBundle);
  const watchlistEmpty =
    activeBundleReady && Boolean(watchlistSlugFilter) && filtered.length === 0;
  const myWatchlistNeedsSignIn = myWatchlistOnly && !signedIn;

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
                compact
              />
            ) : null}
            {viewMode === "themes" ? (
              <CheckboxMultiSelectDropdown
                label="Groups"
                options={visibleGroupOptions}
                selected={visibleSelectedGroups}
                onChange={setSelectedGroups}
                emptyLabel="All groups"
                layout="inline"
                compact
              />
            ) : null}
            <CompareColumnsDropdown
              available={sessionColumns}
              prefs={columnPrefs}
              onChange={setColumnPrefs}
              onReset={() => setColumnPrefs(null)}
            />
          </div>
        </div>
        {activeBundleReady ? (
          <CompareSummaryPanel
            rows={filtered}
            metricColumn={summaryMetricColumn}
            entityKind={viewMode === "groups" ? "group" : "theme"}
          />
        ) : (
          <p className={pageStyles.muted}>
            {viewMode === "groups"
              ? groupsFailed && !groupsLoading
                ? "Group returns are temporarily unavailable."
                : "Loading group returns…"
              : themesFailed && !themesLoading
                ? "Theme returns are temporarily unavailable."
                : "Loading theme returns…"}
          </p>
        )}
      </div>
      <section className={pageStyles.compareSectionTight}>
        {activeBundleReady ? (
          <>
            {myWatchlistNeedsSignIn ? (
              <p className={pageStyles.muted} style={{ marginBottom: 10 }}>
                <Link href={signInHref}>Sign in</Link> to filter by your watchlist.
              </p>
            ) : null}
            {watchlistEmpty && !myWatchlistNeedsSignIn ? (
              <p className={pageStyles.muted} style={{ marginBottom: 10 }}>
                {myWatchlistOnly && topPicksOnly
                  ? "No themes match My Watchlist or Most talked about with the current filters."
                  : myWatchlistOnly
                    ? "No saved themes match the current filters."
                    : "No talked-about themes match the current filters."}
              </p>
            ) : null}
          <CompareThemesTable
            benchmarkRows={tableBenchmarkRows}
            rows={filtered}
            columns={visibleColumns}
            selectedDates={selectedDates}
            entityKind={viewMode === "groups" ? "group" : "theme"}
            initialSortKey={urlSortKey}
            onPrimarySortKeyChange={onPrimarySortKeyChange}
            toolbarStart={
              <div className={styles.referenceToggles}>
                {benchmarkRows.length > 0 ? (
                  <label className={styles.benchmarkToggle}>
                    <input
                      type="checkbox"
                      checked={showBenchmarks}
                      onChange={(e) => setShowBenchmarks(e.target.checked)}
                    />
                    <span className={styles.toggleLabelFull}>Sector ETFs</span>
                    <span className={styles.toggleLabelShort}>ETFs</span>
                  </label>
                ) : null}
                {factorSpreadRows.length > 0 ? (
                  <label className={styles.benchmarkToggle}>
                    <input
                      type="checkbox"
                      checked={showFactorSpreads}
                      onChange={(e) => setShowFactorSpreads(e.target.checked)}
                    />
                    <span className={styles.toggleLabelFull}>Factor Spreads</span>
                    <span className={styles.toggleLabelShort}>Factors</span>
                  </label>
                ) : null}
                <label className={styles.benchmarkToggle}>
                  <input
                    type="checkbox"
                    checked={excludeShort}
                    onChange={(e) => setExcludeShort(e.target.checked)}
                  />
                  <span className={styles.toggleLabelFull}>
                    {viewMode === "groups" ? "Exclude Short Groups" : "Exclude Short Themes"}
                  </span>
                  <span className={styles.toggleLabelShort}>
                    {viewMode === "groups" ? "No short groups" : "No short themes"}
                  </span>
                </label>
                {viewMode === "themes" ? (
                  <label className={styles.benchmarkToggle}>
                    <input
                      type="checkbox"
                      checked={excludeSupportingThemes}
                      onChange={(e) => setExcludeSupportingThemes(e.target.checked)}
                    />
                    <span className={styles.toggleLabelFull}>Exclude Supporting Themes</span>
                    <span className={styles.toggleLabelShort}>No supporting</span>
                  </label>
                ) : null}
                {/* Mobile: start a new row for My Watchlist + Most talked about. */}
                <span className={styles.watchlistToggleBreak} aria-hidden="true" />
                <label className={styles.benchmarkToggle}>
                  <input
                    type="checkbox"
                    checked={myWatchlistOnly}
                    onChange={(e) => setMyWatchlistOnly(e.target.checked)}
                  />
                  <span>My Watchlist</span>
                </label>
                <label
                  className={styles.benchmarkToggle}
                  title="Themes most discussed lately — not a performance call"
                >
                  <input
                    type="checkbox"
                    checked={topPicksOnly}
                    onChange={(e) => setTopPicksOnly(e.target.checked)}
                  />
                  <span className={styles.toggleLabelFull}>Most talked about</span>
                  <span className={styles.toggleLabelShort}>Talked about</span>
                </label>
              </div>
            }
          />
          </>
        ) : (
          <p className={pageStyles.muted} aria-live="polite">
            {viewMode === "groups"
              ? groupsFailed && !groupsLoading
                ? "Group returns are temporarily unavailable."
                : "Loading the latest group returns…"
              : themesFailed && !themesLoading
                ? "Theme returns are temporarily unavailable."
                : "Loading the latest theme returns…"}
          </p>
        )}
      </section>
    </>
  );
}
