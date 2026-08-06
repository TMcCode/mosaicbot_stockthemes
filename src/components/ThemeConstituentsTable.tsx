"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { ConstituentLogo } from "@/components/ConstituentLogo";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { TickerBadge } from "@/components/TickerBadge";
import { formatUsdMarketCap } from "@/lib/constituentMeta";
import {
  CONSTITUENT_EARNINGS_COLUMNS,
  type ConstituentEarningsColumnId,
} from "@/lib/constituentEarningsColumnHelp";
import {
  compareNullableNumbers,
  compareText,
  DEFAULT_CONSTITUENT_SORT,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { buildSelectedDateLookup, metricColumnHeaderTooltip } from "@/lib/customDateColumnHelp";
import { trendingColumnHeader } from "@/lib/trendingCompareMetrics";
import { formatWeight } from "@/lib/formatWeight";
import { brandAssetPath } from "@/lib/siteUrl";
import {
  formatConstituentPct,
  priceReturnStat,
  type ConstituentTableRow,
  type ThemeConstituentTableModel,
} from "@/lib/themeConstituentTableModel";
import {
  hasThemeManualWeightReturns,
  THEME_EARNINGS_COMPARE_METRIC,
  themeManualWeightReturnPct,
} from "@/lib/themeConstituentThemeReturn";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";
import { useThemeQualityRiskSidecar } from "@/hooks/useThemeQualityRiskSidecar";
import { useSessionVisibleColumns } from "@/hooks/useSessionVisibleColumns";
import { useThemeRevenueSidecar } from "@/hooks/useThemeRevenueSidecar";
import { prefetchThemeRevenueSidecar } from "@/lib/prefetchThemeRevenueSidecar";

const ThemeConstituentsRevenuePanel = dynamic(
  () =>
    import("@/components/ThemeConstituentsRevenuePanel").then(
      (module) => module.ThemeConstituentsRevenuePanel,
    ),
  { loading: () => <p className={styles.muted}>Loading revenue view…</p> },
);

const ThemeConstituentsRevisionsPanel = dynamic(
  () =>
    import("@/components/ThemeConstituentsRevisionsPanel").then(
      (module) => module.ThemeConstituentsRevisionsPanel,
    ),
  { loading: () => <p className={styles.muted}>Loading revenue revisions view…</p> },
);

const ThemeConstituentsQualityRiskPanel = dynamic(
  () => import("@/components/ThemeConstituentsQualityRiskPanel"),
  { loading: () => <p className={styles.muted}>Loading quality and risk view…</p> },
);

type TableView = "returns" | "earnings" | "revenue" | "revisions" | "quality_risk";

type Props = {
  detail: ThemeDetailV0;
  model: ThemeConstituentTableModel;
  livePrices?: boolean;
  selectedDates?: ManifestSelectedDateV0[];
  slug?: string;
  dataBaseUrl?: string;
};

function ProtectedTablePrompt({ signInHref }: { signInHref: string }) {
  return (
    <div className={tableStyles.protectedPrompt} aria-label="Sign in required">
      <p className={tableStyles.protectedTitle}>Sign in to view this analysis</p>
      <p className={tableStyles.protectedCopy}>
        Revenue, revenue revisions, and quality and risk metrics are available with a free account.
      </p>
      <Link href={signInHref} className={tableStyles.protectedSignIn}>
        Sign in free
      </Link>
    </div>
  );
}

function earningsSortValue(
  row: ConstituentTableRow,
  id: ConstituentEarningsColumnId,
): number | string | null {
  const { earnings, constituent } = row;
  switch (id) {
    case "prev_report_date":
      return constituent.last_report_date ?? earnings.lastReportDateCell;
    case "current_quarter_report_date":
      return constituent.next_report_date ?? earnings.reportDateCell;
    case "last_quarter_earnings_move":
      return earnings.lastQuarterEarningsMoveValue;
    case "earnings_move":
      return earnings.earningsPerfValue;
    case "avg_abs_rpt":
      return earnings.avgAbsRptValue;
    case "intra_quarter_move":
      return earnings.intraQtrValue;
    case "since_last_report":
      return earnings.sinceQtrRptValue;
    default:
      return null;
  }
}

function compareConstituentRows(
  a: ConstituentTableRow,
  b: ConstituentTableRow,
  sorts: ConstituentSortState[],
): number {
  for (const s of sorts) {
    if (s.key === "company") {
      const cmp = compareText(
        a.constituent.name?.trim() || a.constituent.ticker,
        b.constituent.name?.trim() || b.constituent.ticker,
        s.dir,
      );
      if (cmp !== 0) return cmp;
      continue;
    }
    if (s.key === "weight") {
      const cmp = compareNullableNumbers(a.weight, b.weight, s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    if (s.key === "mcap") {
      const cmp = compareNullableNumbers(a.marketCapUsd, b.marketCapUsd, s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    const earningsCol = CONSTITUENT_EARNINGS_COLUMNS.find((c) => c.id === s.key);
    if (earningsCol) {
      const va = earningsSortValue(a, earningsCol.id);
      const vb = earningsSortValue(b, earningsCol.id);
      if (typeof va === "string" || typeof vb === "string") {
        const cmp = compareText(String(va ?? ""), String(vb ?? ""), s.dir);
        if (cmp !== 0) return cmp;
        continue;
      }
      const cmp = compareNullableNumbers(va, vb, s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    const cmp = compareNullableNumbers(a.priceReturns[s.key], b.priceReturns[s.key], s.dir);
    if (cmp !== 0) return cmp;
  }
  return compareText(
    a.constituent.name?.trim() || a.constituent.ticker,
    b.constituent.name?.trim() || b.constituent.ticker,
    "asc",
  );
}

export function ThemeConstituentsTable({
  detail,
  model,
  livePrices = false,
  selectedDates,
  slug,
  dataBaseUrl,
}: Props) {
  const [view, setView] = useState<TableView>("returns");
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const [mountedPanels, setMountedPanels] = useState({
    revenue: false,
    revisions: false,
    quality_risk: false,
  });
  const { configured, loading: authLoading, user } = useSupabaseAuth();
  const hasProtectedAccess = configured && !authLoading && Boolean(user);
  const protectedLocked = !authLoading && !hasProtectedAccess;
  const isProtectedView = view === "revenue" || view === "revisions" || view === "quality_risk";
  const showRevenue = view === "revenue";
  const showRevisions = view === "revisions";
  const showQualityRisk = view === "quality_risk";
  const keepRevenueMounted = mountedPanels.revenue || showRevenue;
  const keepRevisionsMounted = mountedPanels.revisions || showRevisions;
  const keepQualityRiskMounted = mountedPanels.quality_risk || showQualityRisk;
  const needsRevenueSidecar =
    hasProtectedAccess && (keepRevenueMounted || keepRevisionsMounted);
  const sidecarState = useThemeRevenueSidecar(slug, dataBaseUrl, needsRevenueSidecar);
  const qualityRiskState = useThemeQualityRiskSidecar(
    slug,
    dataBaseUrl,
    hasProtectedAccess && keepQualityRiskMounted,
  );

  useEffect(() => {
    if (!hasProtectedAccess) return;
    setMountedPanels((prev) => {
      const next = {
        revenue: prev.revenue || showRevenue,
        revisions: prev.revisions || showRevisions,
        quality_risk: prev.quality_risk || showQualityRisk,
      };
      if (
        next.revenue === prev.revenue &&
        next.revisions === prev.revisions &&
        next.quality_risk === prev.quality_risk
      ) {
        return prev;
      }
      return next;
    });
  }, [hasProtectedAccess, showRevenue, showRevisions, showQualityRisk]);

  // Warm revenue sidecar after sign-in so the first Revenue click skips the cold fetch.
  useEffect(() => {
    if (!hasProtectedAccess || !slug || !dataBaseUrl) return;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      void prefetchThemeRevenueSidecar(slug, dataBaseUrl);
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(run, 400);
    }
    return () => {
      if (idleId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [hasProtectedAccess, slug, dataBaseUrl]);
  const signInHref = `/sign-in?next=${encodeURIComponent(slug ? `/themes/${slug}` : "/themes")}`;
  const selectedDateByKey = useMemo(
    () => buildSelectedDateLookup(selectedDates),
    [selectedDates],
  );
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const {
    hasWeight,
    hasMcap,
    hasPriceReturns,
    priceReturnColumns: modelPriceReturnColumns,
    constituentRows,
    avgEarningsPerf,
    avgLastQuarterEarningsMove,
    avgAvgAbsRpt,
    avgIntraQtr,
    avgSinceQtrRpt,
    avgMarketCap,
    avgWeight,
    stdEarningsPerf,
    stdLastQuarterEarningsMove,
    stdAvgAbsRpt,
    stdIntraQtr,
    stdSinceQtrRpt,
    stdMarketCap,
    stdWeight,
    posEarningsPerf,
    posLastQuarterEarningsMove,
    posIntraQtr,
    posSinceQtrRpt,
    medianEarningsPerf,
    medianLastQuarterEarningsMove,
    medianAvgAbsRpt,
    medianIntraQtr,
    medianSinceQtrRpt,
    medianMarketCap,
    medianWeight,
    minEarningsPerf,
    minLastQuarterEarningsMove,
    minAvgAbsRpt,
    minIntraQtr,
    minSinceQtrRpt,
    minMarketCap,
    minWeight,
    maxEarningsPerf,
    maxLastQuarterEarningsMove,
    maxAvgAbsRpt,
    maxIntraQtr,
    maxSinceQtrRpt,
    maxMarketCap,
    maxWeight,
  } = model;
  const priceReturnColumns = useSessionVisibleColumns(modelPriceReturnColumns);

  const sortedRows = useMemo(() => {
    const out = [...constituentRows];
    out.sort((a, b) => compareConstituentRows(a, b, sorts));
    return out;
  }, [constituentRows, sorts]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => toggleConstituentSort(prev, key, shiftKey));
  };

  const renderSortHead = (key: string, label: ReactNode, title?: string) => (
    <button
      type="button"
      className={`${tableStyles.sortHead} ${activeSortKeys.has(key) ? tableStyles.sortHeadActive : ""}`}
      onClick={(e) => onHeaderClick(key, e.shiftKey)}
      onPointerDown={(e) => e.stopPropagation()}
      title={title}
    >
      {label}
    </button>
  );

  const showReturns = view === "returns";
  const showEarnings = view === "earnings";
  const themeCompare = detail.compare_returns;
  const showThemeReturnRow =
    (view === "returns" || view === "earnings") &&
    hasThemeManualWeightReturns(themeCompare, priceReturnColumns, view);

  const themeReturnPct = (columnKey: string) =>
    formatConstituentPct(themeManualWeightReturnPct(columnKey, themeCompare, detail.name));

  const priceStat = (
    rowKey: Parameters<typeof priceReturnStat>[1],
    col: string,
  ) =>
    priceReturnStat(
      detail,
      rowKey,
      col,
      constituentRows.map((r) => r.priceReturns[col] ?? null),
      { livePrices },
    );

  const priceHeader = (col: string) => {
    const tooltip = metricColumnHeaderTooltip(col, selectedDateByKey);
    return (
      <th key={col} scope="col" title={tooltip}>
        {renderSortHead(col, trendingColumnHeader(col), tooltip)}
      </th>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="constituents-heading">
      <div className={tableStyles.sectionHeader}>
        <h2 id="constituents-heading">{detail.name} Constituents</h2>
        <HorizontalScrollArea
          className={tableStyles.toggleScroll}
          tabIndex={0}
          role="group"
          aria-label="Constituents table columns"
        >
          <div className={tableStyles.toggle}>
            <button
              type="button"
              className={showReturns ? tableStyles.active : undefined}
              aria-pressed={showReturns}
              title="Returns over calendar windows and custom event dates (1D, MTD, YTD, etc.)"
              onClick={() => setView("returns")}
            >
              Period Returns
            </button>
            <button
              type="button"
              className={showEarnings ? tableStyles.active : undefined}
              aria-pressed={showEarnings}
              title="Returns around report dates and the current earnings quarter"
              onClick={() => setView("earnings")}
            >
              Earnings Returns
            </button>
            <button
              type="button"
              className={showRevenue ? tableStyles.active : undefined}
              aria-pressed={showRevenue}
              title={
                protectedLocked
                  ? "Sign in to view analyst revenue growth estimates and valuation ratios"
                  : "Analyst revenue growth estimates and valuation ratios"
              }
              onClick={() => setView("revenue")}
            >
              Revenue {protectedLocked ? <span aria-hidden="true">🔒</span> : null}
            </button>
            <button
              type="button"
              className={showRevisions ? tableStyles.active : undefined}
              aria-pressed={showRevisions}
              title={
                protectedLocked
                  ? "Sign in to view lock-quarter revenue estimate revisions"
                  : "Lock-quarter revenue estimate revisions"
              }
              onClick={() => setView("revisions")}
            >
              Rev Revisions {protectedLocked ? <span aria-hidden="true">🔒</span> : null}
            </button>
            <button
              type="button"
              className={showQualityRisk ? tableStyles.active : undefined}
              aria-pressed={showQualityRisk}
              title={
                protectedLocked
                  ? "Sign in to view quality and risk metrics"
                  : "Reported margins, fiscal EBITDA, and balance-sheet and cash-flow risk metrics"
              }
              onClick={() => setView("quality_risk")}
            >
              Quality &amp; Risk {protectedLocked ? <span aria-hidden="true">🔒</span> : null}
            </button>
          </div>
        </HorizontalScrollArea>
      </div>
      {isProtectedView && authLoading ? (
        <p className={styles.muted}>Checking sign-in…</p>
      ) : null}
      {isProtectedView && !authLoading && !hasProtectedAccess ? (
        <ProtectedTablePrompt signInHref={signInHref} />
      ) : null}
      {hasProtectedAccess && slug && dataBaseUrl ? (
        <>
          {keepRevenueMounted ? (
            <div hidden={!showRevenue} aria-hidden={!showRevenue}>
              <ThemeConstituentsRevenuePanel detail={detail} sidecarState={sidecarState} />
            </div>
          ) : null}
          {keepRevisionsMounted ? (
            <div hidden={!showRevisions} aria-hidden={!showRevisions}>
              <ThemeConstituentsRevisionsPanel detail={detail} sidecarState={sidecarState} />
            </div>
          ) : null}
          {keepQualityRiskMounted ? (
            <div hidden={!showQualityRisk} aria-hidden={!showQualityRisk}>
              <ThemeConstituentsQualityRiskPanel
                detail={detail}
                sidecarState={qualityRiskState}
                slug={slug}
                dataBaseUrl={dataBaseUrl}
              />
            </div>
          ) : null}
        </>
      ) : null}
      {hasProtectedAccess && (showRevenue || showRevisions) && (!slug || !dataBaseUrl) ? (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
          Revenue data is not available in this build.
        </p>
      ) : null}
      {hasProtectedAccess && showQualityRisk && (!slug || !dataBaseUrl) ? (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
          Quality and risk data is not available in this build.
        </p>
      ) : null}
      {!showRevenue && !showRevisions && !showQualityRisk ? (
      <div className={styles.tableWrap}>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
          data-constituents-view={view}
          tabIndex={0}
          role="region"
          aria-label="Constituents table — scroll horizontally to see all columns"
        >
          <div className={styles.constituentsTableSizer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">{renderSortHead("company", "Company")}</th>
                  {hasWeight ? <th scope="col">{renderSortHead("weight", "Wgt")}</th> : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => priceHeader(col))
                    : null}
                  {showEarnings
                    ? CONSTITUENT_EARNINGS_COLUMNS.map((col) => (
                        <th key={col.id} scope="col" title={col.tooltip}>
                          {renderSortHead(col.id, col.label, col.tooltip)}
                        </th>
                      ))
                    : null}
                  {showReturns && hasMcap ? (
                    <th scope="col">{renderSortHead("mcap", "Mkt Cap")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const c = row.constituent;
                  const earnings = row.earnings;
                  return (
                    <tr key={c.ticker}>
                      <td>
                        <div className={styles.companyCell}>
                          <ConstituentLogo
                            ticker={c.ticker}
                            logoUrl={typeof c.logo_url === "string" ? c.logo_url : null}
                          />
                          <span className={styles.companyName}>{c.name?.trim() || "—"}</span>
                          <TickerBadge ticker={c.ticker} />
                        </div>
                      </td>
                      {hasWeight ? (
                        <td>{c.weight != null ? formatWeight(c.weight) : "—"}</td>
                      ) : null}
                      {showReturns && hasPriceReturns
                        ? priceReturnColumns.map((col) => (
                            <td key={col}>{formatConstituentPct(row.priceReturns[col])}</td>
                          ))
                        : null}
                      {showEarnings ? (
                        <>
                          <td>{earnings.lastReportDateCell}</td>
                          <td>{earnings.reportDateCell}</td>
                          <td>{earnings.lastQuarterEarningsMoveCell}</td>
                          <td>
                            {earnings.earningsPerfCell}
                            {earnings.earningsPerfIsProvisional ? "*" : ""}
                          </td>
                          <td>{earnings.avgAbsRptCell}</td>
                          <td>{earnings.intraQtrCell}</td>
                          <td>{earnings.sinceQtrRptCell}</td>
                        </>
                      ) : null}
                      {showReturns && hasMcap ? (
                        <td>{formatUsdMarketCap(row.marketCapUsd)}</td>
                      ) : null}
                    </tr>
                  );
                })}
                {showThemeReturnRow ? (
                  <tr className={tableStyles.themeReturnRow}>
                    <td>
                      <strong
                        className={tableStyles.themeReturnLabel}
                        title="Manual theme-weight return — same as Theme returns table and the performance chart"
                      >
                        Theme return
                      </strong>
                    </td>
                    {hasWeight ? <td>—</td> : null}
                    {showReturns && hasPriceReturns
                      ? priceReturnColumns.map((col) => (
                          <td key={col}>
                            <strong>{themeReturnPct(col)}</strong>
                          </td>
                        ))
                      : null}
                    {showEarnings
                      ? CONSTITUENT_EARNINGS_COLUMNS.map((col) => {
                          const compareKey = THEME_EARNINGS_COMPARE_METRIC[col.id];
                          return (
                            <td key={col.id}>
                              <strong>
                                {compareKey ? themeReturnPct(compareKey) : "—"}
                              </strong>
                            </td>
                          );
                        })
                      : null}
                    {showReturns && hasMcap ? <td>—</td> : null}
                  </tr>
                ) : null}
                <tr>
                  <td>
                    <strong>Average</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{avgWeight != null ? formatWeight(avgWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("average", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(avgLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgAvgAbsRpt)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(avgMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Median</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{medianWeight != null ? formatWeight(medianWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("median", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(medianLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianAvgAbsRpt)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(medianMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Std Dev</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{stdWeight != null ? formatWeight(stdWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("std_dev", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(stdLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdAvgAbsRpt)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(stdMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Min</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{minWeight != null ? formatWeight(minWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("min", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(minLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minAvgAbsRpt)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(minMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Max</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{maxWeight != null ? formatWeight(maxWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("max", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(maxLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxAvgAbsRpt)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(maxMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>% Positive Tickers</strong>
                  </td>
                  {hasWeight ? <td></td> : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("positive_tickers_pct", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(posLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(posEarningsPerf)}</strong>
                      </td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(posIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(posSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? <td></td> : null}
                </tr>
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
        <div className={styles.tableFooter}>
          {showEarnings ? (
            <p className={styles.tableFootnote}>
              * Provisional value: before LstRpt% reaches its 2-day post-report lock window (BMO/AMC adjusted),
              EarningsPerf is calculated from current vs pre-report and then locks to final LstRpt%.
            </p>
          ) : null}
          <p className={tableStyles.sortHint}>
            Default: Wgt ↓ · Click headers to sort · Shift+click secondary
          </p>
          <div className={styles.tableWatermark} aria-hidden="true">
            <img
              src={brandAssetPath("/brand/logo-full-dark-tight.png")}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
      ) : null}
    </section>
  );
}
