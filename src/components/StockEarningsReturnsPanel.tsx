"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ConstituentsTableSortHint } from "@/components/ConstituentsTableSortHint";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import { medianFinite } from "@/lib/compareReturnPlausible";
import { CONSTITUENT_EARNINGS_COLUMNS } from "@/lib/constituentEarningsColumnHelp";

/** Stock lens: skip Prev/Next Rpt (ticker-only; theme rows are always —). */
const STOCK_EARNINGS_COLUMNS = CONSTITUENT_EARNINGS_COLUMNS.filter(
  (col) => col.id !== "prev_report_date" && col.id !== "current_quarter_report_date",
);
import {
  compareNullableNumbers,
  compareText,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { formatWeight } from "@/lib/formatWeight";
import {
  buildQuarterEarningsRow,
  formatConstituentPct,
} from "@/lib/themeConstituentTableModel";
import { weightedMeanRenormalized } from "@/lib/weightedMeanRenormalized";
import type {
  StockEarningsTableStatsV0,
  StockThemeMembershipAppV0,
  StockTickerEarningsV0,
} from "@/types/stock.detail.v0";
import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

import pageStyles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import styles from "./StockLensPanels.module.css";

const DEFAULT_SORTS: ConstituentSortState[] = [{ key: "weight", dir: "desc" }];

const WEIGHTED_THEMES_LABEL = "Weighted themes";
const WEIGHTED_TIP =
  "Weight-normalized blend of membership theme earnings metrics (ThemeWgt / Σw, renormalized over themes with a value).";
const AVG_TIP = "Equal-weight average across membership themes (themes with missing values skipped).";
const MEDIAN_TIP = "Median across membership themes (themes with missing values skipped).";

const PCT_REPORTED_TIP =
  "Share of theme constituents that have an effective current-quarter report (ET BMO/AMC rules).";
const PCT_POSITIVE_TIP =
  "% of theme constituents with a positive Ern Move % when that column is live; otherwise % positive on Lst Q Ern %.";

type MetricKey =
  | "last_quarter_earnings_move_pct"
  | "earnings_move_pct"
  | "intra_quarter_move_pct"
  | "since_last_report_pct"
  | "avg_abs_rpt_pct"
  | "reported_tickers_pct"
  | "pct_positive"
  | "weight";

type Props = {
  ticker: string;
  themes: StockThemeMembershipAppV0[];
  tickerEarnings: StockTickerEarningsV0 | null;
  /** Prefers ETL; client falls back from membership rows when absent. */
  earningsTableStats?: StockEarningsTableStatsV0 | null;
};

type EarnBodyRow =
  | { kind: "ticker"; earnings: ReturnType<typeof buildQuarterEarningsRow> }
  | { kind: "theme"; theme: StockThemeMembershipAppV0 };

function themeReturnMetric(
  theme: StockThemeMembershipAppV0,
  key: Exclude<MetricKey, "reported_tickers_pct" | "pct_positive" | "weight">,
): number | null {
  const v = theme.earnings_returns?.theme_return?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function themePctReported(theme: StockThemeMembershipAppV0): number | null {
  const v = theme.earnings_returns?.reported_tickers_pct;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function themePctPositive(theme: StockThemeMembershipAppV0): number | null {
  const pos = theme.earnings_returns?.positive_tickers_pct;
  if (!pos) return null;
  const ern = pos.earnings_move_pct;
  if (typeof ern === "number" && Number.isFinite(ern)) return ern;
  const lastQ = pos.last_quarter_earnings_move_pct;
  return typeof lastQ === "number" && Number.isFinite(lastQ) ? lastQ : null;
}

function themeMetricForSummary(theme: StockThemeMembershipAppV0, key: MetricKey): number | null {
  if (key === "weight") {
    return theme.weight != null && Number.isFinite(theme.weight) ? theme.weight : null;
  }
  if (key === "reported_tickers_pct") return themePctReported(theme);
  if (key === "pct_positive") return themePctPositive(theme);
  return themeReturnMetric(theme, key);
}

function meanFinite(values: number[]): number | null {
  if (!values.length) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function earnRowSortValue(
  row: EarnBodyRow,
  key: string,
  tickerLabel: string,
): number | string | null {
  if (key === "theme") {
    return row.kind === "ticker" ? tickerLabel : row.theme.name;
  }
  if (key === "weight") {
    return row.kind === "theme" && row.theme.weight != null && Number.isFinite(row.theme.weight)
      ? row.theme.weight
      : null;
  }
  if (key === "last_quarter_earnings_move") {
    return row.kind === "ticker"
      ? row.earnings.lastQuarterEarningsMoveValue
      : themeReturnMetric(row.theme, "last_quarter_earnings_move_pct");
  }
  if (key === "earnings_move") {
    return row.kind === "ticker"
      ? row.earnings.earningsPerfValue
      : themeReturnMetric(row.theme, "earnings_move_pct");
  }
  if (key === "intra_quarter_move") {
    return row.kind === "ticker"
      ? row.earnings.intraQtrValue
      : themeReturnMetric(row.theme, "intra_quarter_move_pct");
  }
  if (key === "since_last_report") {
    return row.kind === "ticker"
      ? row.earnings.sinceQtrRptValue
      : themeReturnMetric(row.theme, "since_last_report_pct");
  }
  if (key === "avg_abs_rpt") {
    return row.kind === "ticker"
      ? row.earnings.avgAbsRptValue
      : themeReturnMetric(row.theme, "avg_abs_rpt_pct");
  }
  if (key === "pct_reported") {
    return row.kind === "theme" ? themePctReported(row.theme) : null;
  }
  if (key === "pct_positive") {
    return row.kind === "theme" ? themePctPositive(row.theme) : null;
  }
  return null;
}

export function StockEarningsReturnsPanel({
  ticker,
  themes,
  tickerEarnings,
  earningsTableStats,
}: Props) {
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_SORTS);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);
  const hasWeight = themes.some((t) => t.weight != null && Number.isFinite(t.weight));

  const tickerEarnRow = useMemo(() => {
    const c = {
      ticker,
      ...(tickerEarnings || {}),
    } as ThemeDetailConstituentV0;
    return buildQuarterEarningsRow(c);
  }, [ticker, tickerEarnings]);

  const summaryStats = useMemo(() => {
    const keys: MetricKey[] = [
      "weight",
      "last_quarter_earnings_move_pct",
      "earnings_move_pct",
      "intra_quarter_move_pct",
      "since_last_report_pct",
      "avg_abs_rpt_pct",
      "reported_tickers_pct",
      "pct_positive",
    ];
    const fromEtl = (row: "weighted" | "average" | "median", key: MetricKey): number | null => {
      const bucket = earningsTableStats?.[row];
      if (!bucket || typeof bucket !== "object") return null;
      const v = bucket[key];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const clientWeighted: Partial<Record<MetricKey, number | null>> = {};
    const clientAvg: Partial<Record<MetricKey, number | null>> = {};
    const clientMed: Partial<Record<MetricKey, number | null>> = {};
    for (const key of keys) {
      const pairs = themes.map((t) => ({
        weight: t.weight,
        value: themeMetricForSummary(t, key),
      }));
      const vals = pairs
        .map((p) => p.value)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      clientWeighted[key] = key === "weight" ? null : weightedMeanRenormalized(pairs);
      clientAvg[key] = meanFinite(vals);
      clientMed[key] = medianFinite(vals);
    }
    const pick = (row: "weighted" | "average" | "median", key: MetricKey): number | null =>
      fromEtl(row, key) ??
      (row === "weighted" ? clientWeighted[key] : row === "average" ? clientAvg[key] : clientMed[key]) ??
      null;
    return {
      note: earningsTableStats?.note || WEIGHTED_TIP,
      weighted: Object.fromEntries(keys.map((k) => [k, pick("weighted", k)])) as Record<
        MetricKey,
        number | null
      >,
      average: Object.fromEntries(keys.map((k) => [k, pick("average", k)])) as Record<
        MetricKey,
        number | null
      >,
      median: Object.fromEntries(keys.map((k) => [k, pick("median", k)])) as Record<
        MetricKey,
        number | null
      >,
    };
  }, [themes, earningsTableStats]);

  const showSummary = themes.length > 0;

  const sortedRows = useMemo(() => {
    const themeRows: EarnBodyRow[] = themes.map((theme) => ({ kind: "theme", theme }));
    const primary = sorts[0]?.key;
    const tickerRow: EarnBodyRow = { kind: "ticker", earnings: tickerEarnRow };
    const cmp = (a: EarnBodyRow, b: EarnBodyRow) => {
      for (const s of sorts) {
        const va = earnRowSortValue(a, s.key, ticker);
        const vb = earnRowSortValue(b, s.key, ticker);
        if (typeof va === "string" || typeof vb === "string") {
          const c = compareText(String(va ?? ""), String(vb ?? ""), s.dir);
          if (c !== 0) return c;
          continue;
        }
        const c = compareNullableNumbers(
          typeof va === "number" ? va : null,
          typeof vb === "number" ? vb : null,
          s.dir,
        );
        if (c !== 0) return c;
      }
      return 0;
    };
    if (primary === "weight") {
      themeRows.sort(cmp);
      return [tickerRow, ...themeRows];
    }
    const rows = [tickerRow, ...themeRows];
    rows.sort(cmp);
    return rows;
  }, [themes, sorts, tickerEarnRow, ticker]);

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

  const renderSummaryCells = (bucket: Record<MetricKey, number | null>) => (
    <>
      {hasWeight ? (
        <td className={styles.wgtCell} style={{ textAlign: "right" }}>
          {bucket.weight != null ? formatWeight(bucket.weight) : "—"}
        </td>
      ) : null}
      <td style={{ textAlign: "right" }}>
        {formatConstituentPct(bucket.last_quarter_earnings_move_pct)}
      </td>
      <td style={{ textAlign: "right" }}>{formatConstituentPct(bucket.earnings_move_pct)}</td>
      <td style={{ textAlign: "right" }}>
        {formatConstituentPct(bucket.intra_quarter_move_pct)}
      </td>
      <td style={{ textAlign: "right" }}>
        {formatConstituentPct(bucket.since_last_report_pct)}
      </td>
      <td style={{ textAlign: "right" }}>{formatConstituentPct(bucket.avg_abs_rpt_pct)}</td>
      <td style={{ textAlign: "right" }}>
        {formatConstituentPct(bucket.reported_tickers_pct)}
      </td>
      <td style={{ textAlign: "right" }}>{formatConstituentPct(bucket.pct_positive)}</td>
    </>
  );

  return (
    <div className={pageStyles.tableWrap}>
      <HorizontalScrollArea
        className={pageStyles.constituentsScrollWrap}
        data-constituents-view="earnings"
        style={{ ["--constituents-company-col-width" as string]: "400px" }}
        tabIndex={0}
        role="region"
        aria-label="Theme earnings returns — scroll horizontally to see all columns"
      >
        <div className={pageStyles.constituentsTableSizer}>
          <table className={pageStyles.dataTable}>
            <thead>
              <tr>
                <th scope="col">{renderSortHead("theme", "Theme")}</th>
                {hasWeight ? (
                  <th scope="col" style={{ textAlign: "right" }}>
                    {renderSortHead("weight", "Wgt")}
                  </th>
                ) : null}
                {STOCK_EARNINGS_COLUMNS.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    title={col.tooltip}
                    style={{ textAlign: "right" }}
                  >
                    {renderSortHead(col.id, col.label, col.tooltip)}
                  </th>
                ))}
                <th scope="col" title={PCT_REPORTED_TIP} style={{ textAlign: "right" }}>
                  {renderSortHead("pct_reported", "% Rpt", PCT_REPORTED_TIP)}
                </th>
                <th scope="col" title={PCT_POSITIVE_TIP} style={{ textAlign: "right" }}>
                  {renderSortHead("pct_positive", "% Pos", PCT_POSITIVE_TIP)}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                if (row.kind === "ticker") {
                  const e = row.earnings;
                  return (
                    <tr key={`ticker:${ticker}`} className={styles.tickerHeatRow}>
                      <td>
                        <span className={styles.tickerHeatLabel}>{ticker}</span>
                      </td>
                      {hasWeight ? <td style={{ textAlign: "right" }}>—</td> : null}
                      <td style={{ textAlign: "right" }}>{e.lastQuarterEarningsMoveCell}</td>
                      <td style={{ textAlign: "right" }}>
                        {e.earningsPerfCell}
                        {e.earningsPerfIsProvisional ? "*" : ""}
                      </td>
                      <td style={{ textAlign: "right" }}>{e.intraQtrCell}</td>
                      <td style={{ textAlign: "right" }}>{e.sinceQtrRptCell}</td>
                      <td style={{ textAlign: "right" }}>{e.avgAbsRptCell}</td>
                      <td style={{ textAlign: "right" }}>—</td>
                      <td style={{ textAlign: "right" }}>—</td>
                    </tr>
                  );
                }
                const t = row.theme;
                return (
                  <tr key={t.slug}>
                    <td>
                      <Link href={`/themes/${encodeURIComponent(t.slug)}`}>{t.name}</Link>
                    </td>
                    {hasWeight ? (
                      <td className={styles.wgtCell} style={{ textAlign: "right" }}>
                        {t.weight != null && Number.isFinite(t.weight) ? formatWeight(t.weight) : "—"}
                      </td>
                    ) : null}
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themeReturnMetric(t, "last_quarter_earnings_move_pct"))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themeReturnMetric(t, "earnings_move_pct"))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themeReturnMetric(t, "intra_quarter_move_pct"))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themeReturnMetric(t, "since_last_report_pct"))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themeReturnMetric(t, "avg_abs_rpt_pct"))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themePctReported(t))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {formatConstituentPct(themePctPositive(t))}
                    </td>
                  </tr>
                );
              })}
              {showSummary ? (
                <>
                  <tr className={styles.summaryHeatRow}>
                    <td>
                      <span className={styles.summaryHeatLabel} title={summaryStats.note}>
                        {WEIGHTED_THEMES_LABEL}
                      </span>
                    </td>
                    {renderSummaryCells(summaryStats.weighted)}
                  </tr>
                  <tr className={styles.summaryHeatRow}>
                    <td>
                      <span className={styles.summaryHeatLabel} title={AVG_TIP}>
                        Average
                      </span>
                    </td>
                    {renderSummaryCells(summaryStats.average)}
                  </tr>
                  <tr className={styles.summaryHeatRow}>
                    <td>
                      <span className={styles.summaryHeatLabel} title={MEDIAN_TIP}>
                        Median
                      </span>
                    </td>
                    {renderSummaryCells(summaryStats.median)}
                  </tr>
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      </HorizontalScrollArea>
      <div className={pageStyles.tableFooter}>
        <p className={pageStyles.tableFootnote}>
          Theme rows use manual ThemeWgt means of available constituents (same as theme-page Theme
          return). % Rpt / % Pos are theme-level coverage stats. * = provisional Ern Move.
        </p>
        <ConstituentsTableSortHint showScrollHint />
        <TableFooterBrandMark className={pageStyles.tableWatermark} />
      </div>
    </div>
  );
}
