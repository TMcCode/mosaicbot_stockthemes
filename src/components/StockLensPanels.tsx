"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { useLiveStockPriceReturns } from "@/hooks/useLiveStockPriceReturns";
import { useSessionVisibleColumns } from "@/hooks/useSessionVisibleColumns";
import { useStockMembershipNotes } from "@/hooks/useStockMembershipNotes";
import { useStockQualityRiskSidecar } from "@/hooks/useStockQualityRiskSidecar";
import { useStockRevenueSidecar } from "@/hooks/useStockRevenueSidecar";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { prefetchStockQualityRiskSidecar } from "@/lib/prefetchStockQualityRiskSidecar";
import { prefetchStockRevenueSidecar } from "@/lib/prefetchStockRevenueSidecar";
import { priceReturnMetric } from "@/lib/constituentPriceReturns";
import {
  compareNullableNumbers,
  compareText,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { buildSelectedDateLookup, metricColumnHeaderTooltip } from "@/lib/customDateColumnHelp";
import { formatWeight } from "@/lib/formatWeight";
import { normalizeGroupThemesColumnOrder } from "@/lib/groupThemesTable";
import {
  mergeStockDetailWithApp,
  parseStockAppPayload,
  stockAppBrowserPath,
} from "@/lib/mergeStockApp";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { medianFinite } from "@/lib/compareReturnPlausible";
import { formatConstituentPct } from "@/lib/themeConstituentTableModel";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import {
  normalizeCompareColumnOrder,
  trendingColumnHeader,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { StockThemeIndexV0 } from "@/types/stock.app.v0";
import type {
  StockDetailV0,
  StockEarningsTableStatsV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
  StockTickerEarningsV0,
} from "@/types/stock.detail.v0";
import type { ConstituentPriceReturnsV0 } from "@/types/theme.detail.v0";

import { ConstituentsTableSortHint } from "@/components/ConstituentsTableSortHint";
import { StockEarningsReturnsPanel } from "@/components/StockEarningsReturnsPanel";
import { StockNotesPanel } from "@/components/StockNotesPanel";
import { StockQualityRiskPanel } from "@/components/StockQualityRiskPanel";
import { StockRevenuePanel } from "@/components/StockRevenuePanel";
import { StockRevisionsPanel } from "@/components/StockRevisionsPanel";
import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import pageStyles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import styles from "./StockLensPanels.module.css";

type LensView = "period" | "earnings" | "revenue" | "revisions" | "quality_risk" | "notes";

function ProtectedRevenuePrompt({ signInHref }: { signInHref: string }) {
  return (
    <div className={tableStyles.protectedPrompt} aria-label="Sign in required">
      <p className={tableStyles.protectedTitle}>Sign in to view this analysis</p>
      <p className={tableStyles.protectedCopy}>
        Revenue, revenue revisions, quality and risk, and membership notes are available with a free
        account.
      </p>
      <Link href={signInHref} className={tableStyles.protectedSignIn}>
        Sign in free
      </Link>
    </div>
  );
}

const DEFAULT_SORTS: ConstituentSortState[] = [{ key: "weight", dir: "desc" }];

const WEIGHTED_THEMES_LABEL = "Weighted themes";
const WEIGHTED_THEMES_TIP =
  "Weight-normalized blend of this ticker’s membership themes (current weights held constant). Same series as the Weighted themes chart overlay.";
const AVG_TIP =
  "Equal-weight average across membership themes for each column (themes with missing values are skipped). Not weight-normalized.";

/** "Apple Inc." → "Apple". */
function stockCompanyShortName(displayName: string | undefined, ticker: string): string {
  const raw = (displayName || ticker).trim() || ticker;
  const short = raw
    .replace(
      /,?\s+(Inc\.?|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|PLC|N\.?V\.?|S\.?A\.?|Co\.?)\s*$/i,
      "",
    )
    .trim();
  return short || raw;
}

/** Aria / plain title: "Apple Inc." → "Apple AAPL Themes". */
function stockThemesSectionTitle(displayName: string | undefined, ticker: string): string {
  return `${stockCompanyShortName(displayName, ticker)} ${ticker} Themes`;
}
const MEDIAN_TIP =
  "Median across membership themes for each column (themes with missing values are skipped). Not weight-normalized.";

function meanFinite(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

type Props = {
  ticker: string;
  /** Company display name for the heatmap heading (e.g. Apple → "Apple themes"). */
  displayName?: string;
  /** Same CDN ``logo_url`` as the hero — reused img, no extra fetch when cached. */
  logoUrl?: string | null;
  dataBaseUrl: string;
  /** Public membership (slug/name) — Tier B weights/metrics hydrate client-side when `hydrateTierB`. */
  themes: StockThemeMembershipPublicV0[] | StockThemeMembershipAppV0[];
  heatmapColumns?: string[];
  /** Offline/fixture seed only; omitted in production so View Source stays slim. */
  serverPriceReturns?: ConstituentPriceReturnsV0 | null;
  serverAsOf?: string;
  selectedDates?: ManifestSelectedDateV0[];
  /** When true, fetch `.app.v0.json` + price_returns via `/cdn-app` (default if dataBaseUrl set). */
  hydrateTierB?: boolean;
};

/** Earnings horizons live on the Earnings Returns tab — omit from Period Returns. */
const PERIOD_RETURNS_SKIP = new Set(["LstRpt %", "SinceLstRpt"]);

/**
 * Same order as group/theme metric tables: Pre/Post → calendar (3M after MTD) →
 * Period/2Y/5Y → custom dates (no LstRpt / SinceLstRpt).
 */
function heatmapMetricColumns(
  themes: StockThemeMembershipAppV0[],
  preferred: string[],
  priceReturns?: ConstituentPriceReturnsV0 | null,
): string[] {
  const seen = new Set<string>();
  const raw: string[] = [];
  const push = (col: string) => {
    const key = String(col || "").trim();
    if (!key || seen.has(key) || PERIOD_RETURNS_SKIP.has(key)) return;
    seen.add(key);
    raw.push(key);
  };
  for (const c of preferred) push(c);
  for (const t of themes) {
    const cols = t.compare_returns?.columns || Object.keys(t.compare_returns?.metrics || {});
    for (const c of cols) push(c);
  }
  if (priceReturns) {
    for (const c of priceReturns.columns || Object.keys(priceReturns.metrics || {})) push(c);
  }
  return normalizeGroupThemesColumnOrder(normalizeCompareColumnOrder(raw)).filter(
    (c) => !PERIOD_RETURNS_SKIP.has(c),
  );
}

function metricHeaderLabel(col: string): string {
  if (col === "Period") return "1Yr %";
  if (col === "2Y") return "2Yr %";
  if (col === "5Y") return "5Yr %";
  return trendingColumnHeader(col);
}

function themeMetricValue(t: StockThemeMembershipAppV0, col: string): number | null {
  const v = valueForTrendingColumn(col, t.compare_returns ?? undefined, {}, t.name);
  return v != null && Number.isFinite(v) ? v : null;
}

type HeatBodyRow =
  | { kind: "ticker"; label: string }
  | { kind: "theme"; theme: StockThemeMembershipAppV0 };

function heatRowLabel(row: HeatBodyRow): string {
  return row.kind === "ticker" ? row.label : row.theme.name || row.theme.slug;
}

function heatRowWeight(row: HeatBodyRow): number | null {
  return row.kind === "theme" && row.theme.weight != null && Number.isFinite(row.theme.weight)
    ? row.theme.weight
    : null;
}

function heatRowMetric(
  row: HeatBodyRow,
  col: string,
  priceReturns: ConstituentPriceReturnsV0 | null | undefined,
): number | null {
  if (row.kind === "ticker") {
    if (!priceReturns) return null;
    return priceReturnMetric({ price_returns: priceReturns }, col);
  }
  return themeMetricValue(row.theme, col);
}

function compareHeatBodyRows(
  a: HeatBodyRow,
  b: HeatBodyRow,
  sorts: ConstituentSortState[],
  priceReturns: ConstituentPriceReturnsV0 | null | undefined,
): number {
  for (const s of sorts) {
    if (s.key === "theme") {
      const cmp = compareText(heatRowLabel(a), heatRowLabel(b), s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    if (s.key === "weight") {
      const cmp = compareNullableNumbers(heatRowWeight(a), heatRowWeight(b), s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    const cmp = compareNullableNumbers(
      heatRowMetric(a, s.key, priceReturns),
      heatRowMetric(b, s.key, priceReturns),
      s.dir,
    );
    if (cmp !== 0) return cmp;
  }
  return compareText(heatRowLabel(a), heatRowLabel(b), "asc");
}

export function StockLensPanels({
  ticker,
  displayName,
  logoUrl,
  dataBaseUrl,
  themes: themesProp,
  heatmapColumns: heatmapColumnsProp = [],
  serverPriceReturns,
  serverAsOf,
  selectedDates = [],
  hydrateTierB,
}: Props) {
  const clientTierB = hydrateTierB ?? Boolean(dataBaseUrl);
  const themeShellKey = themesProp.map((t) => t.slug).join("|");
  const heatmapColsKey = heatmapColumnsProp.join("|");

  const [liveThemes, setLiveThemes] = useState<StockThemeMembershipAppV0[]>(() =>
    themesProp.map((t) => ({ ...t })),
  );
  const [heatmapColumns, setHeatmapColumns] = useState(heatmapColumnsProp);
  const [themeIndex, setThemeIndex] = useState<StockThemeIndexV0 | null>(null);
  const [tickerEarnings, setTickerEarnings] = useState<StockTickerEarningsV0 | null>(null);
  const [earningsTableStats, setEarningsTableStats] = useState<StockEarningsTableStatsV0 | null>(
    null,
  );
  const [appReady, setAppReady] = useState(!clientTierB);
  const [view, setView] = useState<LensView>("period");
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_SORTS);
  const [revenueMounted, setRevenueMounted] = useState(false);
  const [qualityRiskMounted, setQualityRiskMounted] = useState(false);
  const [notesMounted, setNotesMounted] = useState(false);
  const { configured, loading: authLoading, user } = useSupabaseAuth();
  const hasProtectedAccess = configured && !authLoading && Boolean(user);
  const showPeriod = view === "period";
  const showEarnings = view === "earnings";
  const showRevenue = view === "revenue";
  const showRevisions = view === "revisions";
  const showQualityRisk = view === "quality_risk";
  const showNotes = view === "notes";
  const protectedLocked =
    (showRevenue || showRevisions || showQualityRisk || showNotes) &&
    !authLoading &&
    !hasProtectedAccess;
  const needsRevenueSidecar =
    hasProtectedAccess && (revenueMounted || showRevenue || showRevisions);
  const needsQualityRiskSidecar =
    hasProtectedAccess && (qualityRiskMounted || showQualityRisk);
  const needsNotes =
    hasProtectedAccess && (notesMounted || showNotes);
  const revenueSidecar = useStockRevenueSidecar(ticker, dataBaseUrl, needsRevenueSidecar);
  const qualityRiskSidecar = useStockQualityRiskSidecar(
    ticker,
    dataBaseUrl,
    needsQualityRiskSidecar,
  );
  const membershipThemeSlugs = useMemo(
    () => liveThemes.map((t) => t.slug).filter(Boolean),
    [liveThemes],
  );
  const membershipNotes = useStockMembershipNotes(
    ticker,
    membershipThemeSlugs,
    dataBaseUrl,
    needsNotes,
  );
  const signInHref = `/sign-in?next=${encodeURIComponent(`/stocks/${encodeURIComponent(ticker)}`)}`;

  useEffect(() => {
    if (!hasProtectedAccess || (!showRevenue && !showRevisions)) return;
    setRevenueMounted(true);
  }, [hasProtectedAccess, showRevenue, showRevisions]);

  useEffect(() => {
    if (!hasProtectedAccess || !showQualityRisk) return;
    setQualityRiskMounted(true);
  }, [hasProtectedAccess, showQualityRisk]);

  useEffect(() => {
    if (!hasProtectedAccess || !showNotes) return;
    setNotesMounted(true);
  }, [hasProtectedAccess, showNotes]);

  useEffect(() => {
    if (!hasProtectedAccess || !ticker || !dataBaseUrl) return;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      void prefetchStockRevenueSidecar(ticker, dataBaseUrl);
      void prefetchStockQualityRiskSidecar(ticker, dataBaseUrl);
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
  }, [hasProtectedAccess, ticker, dataBaseUrl]);

  useEffect(() => {
    if (!clientTierB) {
      setLiveThemes(themesProp.map((t) => ({ ...t })));
      setHeatmapColumns(heatmapColumnsProp);
      setAppReady(true);
      return;
    }
    let cancelled = false;
    setAppReady(false);
    const shellThemes = themesProp.map((t) => ({
      slug: t.slug,
      name: t.name,
      group_slug: t.group_slug,
      group_name: t.group_name,
    }));
    const q = stockthemesBrowserCacheBusterQuery();
    const url = `${stockAppBrowserPath(ticker)}?${q}`;
    void (async () => {
      try {
        const res = await fetch(url, {
          credentials: "omit",
          cache: stockthemesBrowserFetchCache(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const app = parseStockAppPayload(await res.json());
        if (cancelled) return;
        const publicShell: StockDetailV0 = {
          schema_version: 0,
          ticker,
          as_of: serverAsOf || "",
          themes: shellThemes,
        };
        const merged = mergeStockDetailWithApp(publicShell, app);
        setLiveThemes(merged.themes);
        setHeatmapColumns(merged.theme_heatmap_columns || heatmapColumnsProp);
        setThemeIndex(merged.theme_index ?? null);
        setTickerEarnings(app?.earnings && typeof app.earnings === "object" ? app.earnings : null);
        setEarningsTableStats(
          app?.earnings_table_stats && typeof app.earnings_table_stats === "object"
            ? app.earnings_table_stats
            : null,
        );
      } catch {
        if (!cancelled) {
          setLiveThemes(themesProp.map((t) => ({ ...t })));
          setTickerEarnings(null);
          setEarningsTableStats(null);
        }
      } finally {
        if (!cancelled) setAppReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- themeShellKey / heatmapColsKey
  }, [clientTierB, ticker, themeShellKey, heatmapColsKey, serverAsOf]);

  const { priceReturns } = useLiveStockPriceReturns(
    ticker,
    dataBaseUrl,
    clientTierB ? null : serverPriceReturns,
    serverAsOf,
    clientTierB,
  );

  const themes = liveThemes;

  const selectedDateByKey = useMemo(
    () => buildSelectedDateLookup(selectedDates),
    [selectedDates],
  );

  const heatColsAll = useMemo(
    () => heatmapMetricColumns(themes, heatmapColumns, priceReturns),
    [themes, heatmapColumns, priceReturns],
  );
  const heatCols = useSessionVisibleColumns(heatColsAll);

  const primarySortKey = sorts[0]?.key;
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  /** Weighted themes pinned at bottom. Default weight sort: ticker on top, then themes. Other sorts: ticker + themes together. */
  const sortedBodyRows = useMemo(() => {
    const themeRows: HeatBodyRow[] = themes.map((t) => ({ kind: "theme" as const, theme: t }));
    const primary = sorts[0]?.key;
    if (!priceReturns) {
      themeRows.sort((a, b) => compareHeatBodyRows(a, b, sorts, priceReturns));
      return themeRows;
    }
    const tickerRow: HeatBodyRow = { kind: "ticker", label: ticker };
    if (primary === "weight") {
      themeRows.sort((a, b) => compareHeatBodyRows(a, b, sorts, priceReturns));
      return [tickerRow, ...themeRows];
    }
    const rows = [tickerRow, ...themeRows];
    rows.sort((a, b) => compareHeatBodyRows(a, b, sorts, priceReturns));
    return rows;
  }, [themes, sorts, priceReturns, ticker]);

  /** Theme Period Returns: heat only the primary sorted return column. */
  const heatByRowKey = useMemo(() => {
    if (!primarySortKey || !heatCols.includes(primarySortKey)) return null;
    const out = new Map<string, { backgroundColor: string; color: string }>();
    if (priceReturns) {
      const v = priceReturnMetric({ price_returns: priceReturns }, primarySortKey);
      if (v != null) out.set(`ticker:${ticker}`, trendingReturnHeatStyle(v));
    }
    for (const t of themes) {
      const v = themeMetricValue(t, primarySortKey);
      if (v != null) out.set(`theme:${t.slug}`, trendingReturnHeatStyle(v));
    }
    return out;
  }, [primarySortKey, heatCols, priceReturns, themes, ticker]);

  const showHeatmap = heatCols.length > 0 && (themes.length > 0 || Boolean(priceReturns));

  const themeSummaryStats = useMemo(() => {
    const weights = themes
      .map((t) => t.weight)
      .filter((w): w is number => w != null && Number.isFinite(w));
    const metricAvg: Record<string, number | null> = {};
    const metricMed: Record<string, number | null> = {};
    for (const c of heatCols) {
      const vals = themes
        .map((t) => themeMetricValue(t, c))
        .filter((v): v is number => v != null && Number.isFinite(v));
      metricAvg[c] = meanFinite(vals);
      metricMed[c] = medianFinite(vals);
    }
    return {
      avgWeight: meanFinite(weights),
      medianWeight: medianFinite(weights),
      metricAvg,
      metricMed,
    };
  }, [themes, heatCols]);

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

  const heatmapTitle = stockThemesSectionTitle(displayName, ticker);
  const showSection = themes.length > 0 || Boolean(priceReturns) || Boolean(tickerEarnings);

  return (
    <>
      {showSection ? (
        <section className={styles.section} aria-label={heatmapTitle}>
          <div className={`${tableStyles.sectionHeader} ${styles.sectionHeader}`}>
            <h2 className={styles.sectionTitle}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- same CDN URL as hero; browser cache
                <img
                  src={logoUrl}
                  alt=""
                  width={22}
                  height={22}
                  className={styles.sectionLogo}
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <span className={styles.sectionTitleText}>
                <span className={styles.sectionCompany}>
                  {stockCompanyShortName(displayName, ticker)}
                </span>{" "}
                <span className={styles.sectionTicker}>{ticker}</span>{" "}
                <span className={styles.sectionThemesWord}>Themes</span>
              </span>
            </h2>
            <HorizontalScrollArea
              className={tableStyles.toggleScroll}
              tabIndex={0}
              role="group"
              aria-label={`${heatmapTitle} columns`}
            >
              <div className={tableStyles.toggle}>
                <button
                  type="button"
                  className={showPeriod ? tableStyles.active : undefined}
                  aria-pressed={showPeriod}
                  title="Theme period returns vs this ticker"
                  onClick={() => {
                    setView("period");
                    setSorts(DEFAULT_SORTS);
                  }}
                >
                  Period Returns
                </button>
                <button
                  type="button"
                  className={showEarnings ? tableStyles.active : undefined}
                  aria-pressed={showEarnings}
                  title="Earnings returns for this ticker and membership themes"
                  onClick={() => {
                    setView("earnings");
                    setSorts(DEFAULT_SORTS);
                  }}
                >
                  Earnings Returns
                </button>
                <button
                  type="button"
                  className={showRevenue ? tableStyles.active : undefined}
                  aria-pressed={showRevenue}
                  title={
                    hasProtectedAccess
                      ? "Analyst revenue growth estimates and valuation ratios"
                      : "Sign in to view analyst revenue growth estimates and valuation ratios"
                  }
                  onClick={() => {
                    setView("revenue");
                    setSorts(DEFAULT_SORTS);
                  }}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  className={showRevisions ? tableStyles.active : undefined}
                  aria-pressed={showRevisions}
                  title={
                    hasProtectedAccess
                      ? "CQ / CY / NY revenue estimate revisions"
                      : "Sign in to view CQ / CY / NY revenue estimate revisions"
                  }
                  onClick={() => {
                    setView("revisions");
                    setSorts(DEFAULT_SORTS);
                  }}
                >
                  Rev Revisions
                </button>
                <button
                  type="button"
                  className={showQualityRisk ? tableStyles.active : undefined}
                  aria-pressed={showQualityRisk}
                  title={
                    hasProtectedAccess
                      ? "Quarterly margins, fiscal margins, and risk metrics"
                      : "Sign in to view quality and risk metrics"
                  }
                  onClick={() => {
                    setView("quality_risk");
                    setSorts(DEFAULT_SORTS);
                  }}
                >
                  Quality & Risk
                </button>
                <button
                  type="button"
                  className={showNotes ? tableStyles.active : undefined}
                  aria-pressed={showNotes}
                  title={
                    hasProtectedAccess
                      ? "Why this ticker is in each membership theme"
                      : "Sign in to view membership notes"
                  }
                  onClick={() => {
                    setView("notes");
                    setSorts(DEFAULT_SORTS);
                  }}
                >
                  Notes
                  {!hasProtectedAccess && !authLoading ? (
                    <span aria-hidden="true"> 🔒</span>
                  ) : null}
                </button>
              </div>
            </HorizontalScrollArea>
          </div>
          {!appReady && clientTierB ? (
            <p className={styles.liveHint}>Loading theme metrics…</p>
          ) : null}
          {showPeriod && showHeatmap ? (
            <div className={pageStyles.tableWrap}>
              <HorizontalScrollArea
                className={pageStyles.constituentsScrollWrap}
                data-constituents-view="returns"
                tabIndex={0}
                role="region"
                aria-label="Theme period returns — scroll horizontally to see all columns"
              >
                <div className={pageStyles.constituentsTableSizer}>
                  <table className={pageStyles.dataTable}>
                    <thead>
                      <tr>
                        <th scope="col">{renderSortHead("theme", "Theme")}</th>
                        <th scope="col" style={{ textAlign: "right" }}>
                          {renderSortHead("weight", "Wgt")}
                        </th>
                        {heatCols.map((c) => (
                          <th
                            key={c}
                            scope="col"
                            title={metricColumnHeaderTooltip(c, selectedDateByKey) || undefined}
                            style={{ textAlign: "right" }}
                          >
                            {renderSortHead(
                              c,
                              metricHeaderLabel(c),
                              metricColumnHeaderTooltip(c, selectedDateByKey) || undefined,
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBodyRows.map((row) => {
                        if (row.kind === "ticker") {
                          return (
                            <tr key={`ticker:${ticker}`} className={styles.tickerHeatRow}>
                              <td>
                                <span className={styles.tickerHeatLabel}>{ticker}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>—</td>
                              {heatCols.map((c) => {
                                const v = heatRowMetric(row, c, priceReturns);
                                const heat =
                                  heatByRowKey && c === primarySortKey
                                    ? heatByRowKey.get(`ticker:${ticker}`)
                                    : undefined;
                                return (
                                  <td key={c} style={{ textAlign: "right", ...heat }}>
                                    {formatConstituentPct(v)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }
                        const t = row.theme;
                        return (
                          <tr key={t.slug}>
                            <td>
                              <Link href={`/themes/${encodeURIComponent(t.slug)}`}>{t.name}</Link>
                            </td>
                            <td className={styles.wgtCell} style={{ textAlign: "right" }}>
                              {t.weight != null && Number.isFinite(t.weight)
                                ? formatWeight(t.weight)
                                : "—"}
                            </td>
                            {heatCols.map((c) => {
                              const v = themeMetricValue(t, c);
                              const heat =
                                heatByRowKey && c === primarySortKey
                                  ? heatByRowKey.get(`theme:${t.slug}`)
                                  : undefined;
                              return (
                                <td key={c} style={{ textAlign: "right", ...heat }}>
                                  {formatConstituentPct(v)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {themeIndex?.compare_returns ? (
                        <tr className={styles.summaryHeatRow}>
                          <td>
                            <span
                              className={styles.summaryHeatLabel}
                              title={themeIndex.note || WEIGHTED_THEMES_TIP}
                            >
                              {WEIGHTED_THEMES_LABEL}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>—</td>
                          {heatCols.map((c) => {
                            const v = valueForTrendingColumn(c, themeIndex.compare_returns, {});
                            const heat =
                              v != null &&
                              Number.isFinite(v) &&
                              heatByRowKey &&
                              c === primarySortKey
                                ? trendingReturnHeatStyle(v)
                                : undefined;
                            return (
                              <td key={c} style={{ textAlign: "right", ...heat }}>
                                {formatConstituentPct(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ) : null}
                      {themes.length > 0 ? (
                        <>
                          <tr className={styles.summaryHeatRow}>
                            <td>
                              <span className={styles.summaryHeatLabel} title={AVG_TIP}>
                                Average
                              </span>
                            </td>
                            <td className={styles.wgtCell} style={{ textAlign: "right" }}>
                              {themeSummaryStats.avgWeight != null
                                ? formatWeight(themeSummaryStats.avgWeight)
                                : "—"}
                            </td>
                            {heatCols.map((c) => {
                              const v = themeSummaryStats.metricAvg[c];
                              const heat =
                                v != null && heatByRowKey && c === primarySortKey
                                  ? trendingReturnHeatStyle(v)
                                  : undefined;
                              return (
                                <td key={c} style={{ textAlign: "right", ...heat }}>
                                  {formatConstituentPct(v)}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className={styles.summaryHeatRow}>
                            <td>
                              <span className={styles.summaryHeatLabel} title={MEDIAN_TIP}>
                                Median
                              </span>
                            </td>
                            <td className={styles.wgtCell} style={{ textAlign: "right" }}>
                              {themeSummaryStats.medianWeight != null
                                ? formatWeight(themeSummaryStats.medianWeight)
                                : "—"}
                            </td>
                            {heatCols.map((c) => {
                              const v = themeSummaryStats.metricMed[c];
                              const heat =
                                v != null && heatByRowKey && c === primarySortKey
                                  ? trendingReturnHeatStyle(v)
                                  : undefined;
                              return (
                                <td key={c} style={{ textAlign: "right", ...heat }}>
                                  {formatConstituentPct(v)}
                                </td>
                              );
                            })}
                          </tr>
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </HorizontalScrollArea>
              <div className={pageStyles.tableFooter}>
                <ConstituentsTableSortHint showScrollHint />
                <TableFooterBrandMark className={pageStyles.tableWatermark} />
              </div>
            </div>
          ) : null}
          {showPeriod && !showHeatmap && appReady ? (
            <p className={styles.liveHint}>Period returns are not available yet for this ticker.</p>
          ) : null}
          {showEarnings ? (
            <StockEarningsReturnsPanel
              ticker={ticker}
              themes={themes}
              tickerEarnings={tickerEarnings}
              earningsTableStats={earningsTableStats}
            />
          ) : null}
          {(showRevenue || showRevisions || showQualityRisk || showNotes) && authLoading ? (
            <p className={styles.liveHint}>Checking sign-in…</p>
          ) : null}
          {protectedLocked ? <ProtectedRevenuePrompt signInHref={signInHref} /> : null}
          {showRevenue && hasProtectedAccess ? (
            <StockRevenuePanel
              ticker={ticker}
              membershipThemes={themes}
              sidecarState={revenueSidecar}
            />
          ) : null}
          {showRevisions && hasProtectedAccess ? (
            <StockRevisionsPanel
              ticker={ticker}
              membershipThemes={themes}
              sidecarState={revenueSidecar}
            />
          ) : null}
          {showQualityRisk && hasProtectedAccess ? (
            <StockQualityRiskPanel
              ticker={ticker}
              membershipThemes={themes}
              sidecarState={qualityRiskSidecar}
            />
          ) : null}
          {showNotes && hasProtectedAccess ? (
            <StockNotesPanel
              ticker={ticker}
              membershipThemes={themes}
              notesState={membershipNotes}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
