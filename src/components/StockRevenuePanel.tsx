"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ConstituentsTableSortHint } from "@/components/ConstituentsTableSortHint";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import type { StockRevenueSidecarState } from "@/hooks/useStockRevenueSidecar";
import { medianFinite } from "@/lib/compareReturnPlausible";
import {
  compareNullableNumbers,
  compareText,
  DEFAULT_CONSTITUENT_SORT,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { formatWeight } from "@/lib/formatWeight";
import {
  filterRevenueColumns,
  formatRevenueCell,
  revenueCellClass,
  revenueCellValue,
  revenueColumnFieldKey,
  revenueGroupStartColumnIds,
  revenueGrowthGroupsForColumns,
  type RevenueColumnDef,
  type RevenueDisplayMode,
} from "@/lib/themeRevenue";
import { weightedMeanRenormalized } from "@/lib/weightedMeanRenormalized";
import type { StockRevenueThemeRowV0, StockRevenueV0 } from "@/types/stock.revenue.v0";
import type { ThemeRevenueMetricMapV0 } from "@/types/theme.revenue.v0";

import pageStyles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import styles from "./StockLensPanels.module.css";

const WEIGHTED_THEMES_LABEL = "Weighted themes";
const WEIGHTED_TIP =
  "Weight-normalized blend of membership theme revenue metrics (ThemeWgt / Σw, renormalized over themes with a value).";
const AVG_TIP = "Equal-weight average across membership themes (themes with missing values skipped).";
const MEDIAN_TIP = "Median across membership themes (themes with missing values skipped).";

type MembershipTheme = {
  slug: string;
  name: string;
  weight?: number | null;
  group_slug?: string | null;
  group_name?: string | null;
};

type Props = {
  ticker: string;
  /** Membership shell from stock.app — keeps the table framework visible before revenue publish. */
  membershipThemes: MembershipTheme[];
  sidecarState: StockRevenueSidecarState;
};

type BodyRow =
  | { kind: "ticker"; metrics: ThemeRevenueMetricMapV0 | undefined }
  | { kind: "theme"; theme: StockRevenueThemeRowV0 };

function meanFinite(values: number[]): number | null {
  if (!values.length) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function metricCellClass(colId: string, groupStartIds: Set<string>, tone?: string) {
  const parts = [tableStyles.metricCol];
  if (groupStartIds.has(colId)) parts.push(tableStyles.metricGroupStart);
  if (tone === "pos") parts.push(tableStyles.revenuePos);
  if (tone === "neg") parts.push(tableStyles.revenueNeg);
  return parts.join(" ");
}

function themeMetricValue(
  theme: StockRevenueThemeRowV0,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
): number | null {
  const v = revenueCellValue(theme.metrics, col, mode);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function rowSortValue(
  row: BodyRow,
  key: string,
  tickerLabel: string,
  columns: RevenueColumnDef[],
  mode: RevenueDisplayMode,
): number | string | null {
  if (key === "theme") {
    return row.kind === "ticker" ? tickerLabel : row.theme.name;
  }
  if (key === "weight") {
    return row.kind === "theme" && row.theme.weight != null && Number.isFinite(row.theme.weight)
      ? row.theme.weight
      : null;
  }
  const col = columns.find((c) => c.id === key);
  if (!col) return null;
  if (row.kind === "ticker") {
    const v = revenueCellValue(row.metrics, col, mode);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return themeMetricValue(row.theme, col, mode);
}

function clientSummaryForKey(
  themes: StockRevenueThemeRowV0[],
  col: RevenueColumnDef | null,
  mode: RevenueDisplayMode,
  kind: "weighted" | "average" | "median",
): number | null {
  if (!col) {
    const weights = themes
      .map((t) => t.weight)
      .filter((w): w is number => typeof w === "number" && Number.isFinite(w));
    if (kind === "weighted") return null;
    if (kind === "average") return meanFinite(weights);
    return medianFinite(weights);
  }
  const pairs = themes.map((t) => ({
    weight: t.weight,
    value: themeMetricValue(t, col, mode),
  }));
  const vals = pairs
    .map((p) => p.value)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (kind === "weighted") return weightedMeanRenormalized(pairs);
  if (kind === "average") return meanFinite(vals);
  return medianFinite(vals);
}

export function StockRevenuePanel({ ticker, membershipThemes, sidecarState }: Props) {
  const [mode, setMode] = useState<RevenueDisplayMode>("growth");
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const columns = useMemo(() => filterRevenueColumns(mode), [mode]);
  const groupStartIds = useMemo(() => {
    if (mode === "valuation") return new Set<string>();
    return revenueGroupStartColumnIds(revenueGrowthGroupsForColumns(columns));
  }, [mode, columns]);

  const data: StockRevenueV0 | null = sidecarState.status === "ok" ? sidecarState.data : null;

  /** Prefer sidecar theme rows; fall back to membership shell so the framework always shows. */
  const themes = useMemo((): StockRevenueThemeRowV0[] => {
    if (data?.themes?.length) return data.themes;
    return membershipThemes
      .filter((t) => t.slug && t.name)
      .map((t) => ({
        slug: t.slug,
        name: t.name,
        weight: t.weight,
        group_slug: t.group_slug,
        group_name: t.group_name,
      }));
  }, [data?.themes, membershipThemes]);

  const hasWeight = themes.some((t) => t.weight != null && Number.isFinite(t.weight));
  const metricsPending =
    sidecarState.status === "idle" ||
    sidecarState.status === "loading" ||
    sidecarState.status === "absent" ||
    sidecarState.status === "error" ||
    !data;

  const summaryStats = useMemo(() => {
    const note = data?.note || WEIGHTED_TIP;
    const fromEtl = (
      row: "weighted" | "average" | "median",
      fieldKey: string | undefined,
    ): number | null => {
      if (!fieldKey) return null;
      const bucket = data?.table_stats?.[row];
      if (!bucket) return null;
      const v = bucket[fieldKey];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const pick = (
      row: "weighted" | "average" | "median",
      col: RevenueColumnDef | null,
    ): number | null => {
      const fieldKey = col ? revenueColumnFieldKey(col, mode) : "weight";
      return fromEtl(row, fieldKey || undefined) ?? clientSummaryForKey(themes, col, mode, row);
    };
    return {
      note,
      weighted: {
        weight: pick("weighted", null),
        byCol: Object.fromEntries(columns.map((c) => [c.id, pick("weighted", c)])) as Record<
          string,
          number | null
        >,
      },
      average: {
        weight: pick("average", null),
        byCol: Object.fromEntries(columns.map((c) => [c.id, pick("average", c)])) as Record<
          string,
          number | null
        >,
      },
      median: {
        weight: pick("median", null),
        byCol: Object.fromEntries(columns.map((c) => [c.id, pick("median", c)])) as Record<
          string,
          number | null
        >,
      },
    };
  }, [data, themes, columns, mode]);

  const sortedRows = useMemo(() => {
    const themeRows: BodyRow[] = themes.map((theme) => ({ kind: "theme", theme }));
    const tickerRow: BodyRow = { kind: "ticker", metrics: data?.ticker_metrics };
    const primary = sorts[0]?.key;
    const cmp = (a: BodyRow, b: BodyRow) => {
      for (const s of sorts) {
        const va = rowSortValue(a, s.key, ticker, columns, mode);
        const vb = rowSortValue(b, s.key, ticker, columns, mode);
        if (typeof va === "string" || typeof vb === "string") {
          const c = compareText(
            typeof va === "string" ? va : null,
            typeof vb === "string" ? vb : null,
            s.dir,
          );
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
  }, [themes, data?.ticker_metrics, sorts, ticker, columns, mode]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => toggleConstituentSort(prev, key, shiftKey));
  };

  const statusHint =
    sidecarState.status === "loading" || sidecarState.status === "idle"
      ? "Loading revenue estimates…"
      : sidecarState.status === "error"
        ? "Could not load revenue estimates — showing membership framework."
        : sidecarState.status === "absent" || !data
          ? "Revenue metrics not published yet — showing membership framework."
          : null;

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

  const renderSummaryRow = (
    label: string,
    tip: string,
    bucket: { weight: number | null; byCol: Record<string, number | null> },
  ) => (
    <tr className={styles.summaryHeatRow}>
      <td>
        <span className={styles.summaryHeatLabel} title={tip}>
          {label}
        </span>
      </td>
      {hasWeight ? (
        <td className={styles.wgtCell} style={{ textAlign: "right" }}>
          {bucket.weight != null ? formatWeight(bucket.weight) : "—"}
        </td>
      ) : null}
      {columns.map((col) => {
        const value = bucket.byCol[col.id];
        return (
          <td key={col.id} className={metricCellClass(col.id, groupStartIds)}>
            <strong>{formatRevenueCell(value, col, mode)}</strong>
          </td>
        );
      })}
    </tr>
  );

  return (
    <>
      <div className={tableStyles.revenueToolbar}>
        <div className={tableStyles.toggle} role="group" aria-label="Revenue display mode">
          <button
            type="button"
            className={mode === "growth" ? tableStyles.active : undefined}
            aria-pressed={mode === "growth"}
            onClick={() => setMode("growth")}
          >
            Growth %
          </button>
          <button
            type="button"
            className={mode === "accel" ? tableStyles.active : undefined}
            aria-pressed={mode === "accel"}
            onClick={() => setMode("accel")}
          >
            Accel (pp)
          </button>
          <button
            type="button"
            className={mode === "valuation" ? tableStyles.active : undefined}
            aria-pressed={mode === "valuation"}
            onClick={() => setMode("valuation")}
          >
            Valuation
          </button>
        </div>
      </div>
      {statusHint ? <p className={styles.liveHint}>{statusHint}</p> : null}
      <div className={pageStyles.tableWrap}>
        <HorizontalScrollArea
          className={pageStyles.constituentsScrollWrap}
          data-constituents-view="revenue"
          scrollResetKey={mode}
          tabIndex={0}
          role="region"
          aria-label="Theme revenue — scroll horizontally to see all columns"
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
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      scope="col"
                      className={metricCellClass(col.id, groupStartIds)}
                      title={col.tooltip}
                    >
                      {renderSortHead(
                        col.id,
                        col.label.split("\n").map((line, i) => (
                          <span key={i}>
                            {i > 0 ? <br /> : null}
                            {line}
                          </span>
                        )),
                        col.tooltip,
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  if (row.kind === "ticker") {
                    return (
                      <tr key={`ticker:${ticker}`} className={styles.tickerHeatRow}>
                        <td>
                          <span className={styles.tickerHeatLabel}>{ticker}</span>
                        </td>
                        {hasWeight ? <td style={{ textAlign: "right" }}>—</td> : null}
                        {columns.map((col) => {
                          const value = revenueCellValue(row.metrics, col, mode);
                          const cls = revenueCellClass(value, col);
                          return (
                            <td
                              key={col.id}
                              className={metricCellClass(col.id, groupStartIds, cls)}
                            >
                              {formatRevenueCell(value, col, mode)}
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
                      {hasWeight ? (
                        <td className={styles.wgtCell} style={{ textAlign: "right" }}>
                          {t.weight != null && Number.isFinite(t.weight)
                            ? formatWeight(t.weight)
                            : "—"}
                        </td>
                      ) : null}
                      {columns.map((col) => {
                        const value = themeMetricValue(t, col, mode);
                        const cls = revenueCellClass(value, col);
                        return (
                          <td
                            key={col.id}
                            className={metricCellClass(col.id, groupStartIds, cls)}
                          >
                            {formatRevenueCell(value, col, mode)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {themes.length > 0 ? (
                  <>
                    {renderSummaryRow(WEIGHTED_THEMES_LABEL, summaryStats.note, summaryStats.weighted)}
                    {renderSummaryRow("Average", AVG_TIP, summaryStats.average)}
                    {renderSummaryRow("Median", MEDIAN_TIP, summaryStats.median)}
                  </>
                ) : null}
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
        <div className={pageStyles.tableFooter}>
          <p className={pageStyles.tableFootnote}>
            {metricsPending
              ? "Columns match the theme Revenue tab; cells fill after the next revenue publish."
              : "Theme rows use each theme’s manual-weight revenue summary."}
            {mode === "accel" ? " Accel = Δ growth (pp)." : null}
            {mode === "valuation" ? " PSG = P/S ÷ YoY growth %." : null}
          </p>
          <ConstituentsTableSortHint showScrollHint />
          <TableFooterBrandMark className={pageStyles.tableWatermark} />
        </div>
      </div>
    </>
  );
}
