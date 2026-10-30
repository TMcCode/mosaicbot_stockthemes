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
import { STOCK_REVISION_POS_COLUMNS } from "@/lib/stockRevenue";
import {
  formatRevenueCell,
  REVENUE_REVISION_COLUMNS,
  REVENUE_REVISION_GROUPS,
  revenueCellClass,
  revenueCellValue,
  revenueColumnFieldKey,
  revenueGroupStartColumnIds,
  type RevenueColumnDef,
} from "@/lib/themeRevenue";
import { weightedMeanRenormalized } from "@/lib/weightedMeanRenormalized";
import type { StockRevenueThemeRowV0, StockRevenueV0 } from "@/types/stock.revenue.v0";
import type { ThemeRevenueRevisionsV0 } from "@/types/theme.revenue.v0";

import pageStyles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import styles from "./StockLensPanels.module.css";

const WEIGHTED_THEMES_LABEL = "Weighted themes";
const WEIGHTED_TIP =
  "Weight-normalized blend of membership theme revision metrics (ThemeWgt / Σw, renormalized over themes with a value).";
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
  membershipThemes: MembershipTheme[];
  sidecarState: StockRevenueSidecarState;
};

type PosCol = (typeof STOCK_REVISION_POS_COLUMNS)[number];

type BodyRow =
  | { kind: "ticker"; revisions: ThemeRevenueRevisionsV0 | undefined }
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

function themeRevValue(theme: StockRevenueThemeRowV0, col: RevenueColumnDef): number | null {
  const v = revenueCellValue(undefined, col, "growth", theme.revisions);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function themePosValue(theme: StockRevenueThemeRowV0, col: PosCol): number | null {
  const v = theme.positive_tickers_pct?.[col.deltaKey];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatPosPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function rowSortValue(
  row: BodyRow,
  key: string,
  tickerLabel: string,
  revColumns: RevenueColumnDef[],
): number | string | null {
  if (key === "theme") {
    return row.kind === "ticker" ? tickerLabel : row.theme.name;
  }
  if (key === "weight") {
    return row.kind === "theme" && row.theme.weight != null && Number.isFinite(row.theme.weight)
      ? row.theme.weight
      : null;
  }
  const posCol = STOCK_REVISION_POS_COLUMNS.find((c) => c.id === key);
  if (posCol) {
    return row.kind === "theme" ? themePosValue(row.theme, posCol) : null;
  }
  const col = revColumns.find((c) => c.id === key);
  if (!col) return null;
  if (row.kind === "ticker") {
    const v = revenueCellValue(undefined, col, "growth", row.revisions);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return themeRevValue(row.theme, col);
}

function clientSummaryForField(
  themes: StockRevenueThemeRowV0[],
  field: { kind: "weight" } | { kind: "rev"; col: RevenueColumnDef } | { kind: "pos"; col: PosCol },
  agg: "weighted" | "average" | "median",
): number | null {
  if (field.kind === "weight") {
    const weights = themes
      .map((t) => t.weight)
      .filter((w): w is number => typeof w === "number" && Number.isFinite(w));
    if (agg === "weighted") return null;
    if (agg === "average") return meanFinite(weights);
    return medianFinite(weights);
  }
  const pairs = themes.map((t) => ({
    weight: t.weight,
    value: field.kind === "rev" ? themeRevValue(t, field.col) : themePosValue(t, field.col),
  }));
  const vals = pairs
    .map((p) => p.value)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (agg === "weighted") return weightedMeanRenormalized(pairs);
  if (agg === "average") return meanFinite(vals);
  return medianFinite(vals);
}

export function StockRevisionsPanel({ ticker, membershipThemes, sidecarState }: Props) {
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  /** Stock page omits CQ/CY Low–High (keep Latest / First / Rev Δ / NY set). */
  const revColumns = useMemo(
    () =>
      REVENUE_REVISION_COLUMNS.filter(
        (c) =>
          c.id !== "rev_low" &&
          c.id !== "rev_high" &&
          c.id !== "cy_rev_low" &&
          c.id !== "cy_rev_high",
      ),
    [],
  );
  const analystsCol = revColumns.find((c) => c.id === "rev_analysts");
  const metricColumns = revColumns.filter((c) => c.id !== "rev_analysts");
  const revisionGroups = useMemo(
    () =>
      REVENUE_REVISION_GROUPS.map((g) => ({
        ...g,
        columnIds: g.columnIds.filter(
          (id) =>
            id !== "rev_low" &&
            id !== "rev_high" &&
            id !== "cy_rev_low" &&
            id !== "cy_rev_high",
        ),
      })),
    [],
  );
  const groupStartIds = useMemo(() => {
    const ids = revenueGroupStartColumnIds(revisionGroups);
    // Divider before transposed % Pos CQ/CY/NY Δ block (same mint line as CQ/CY/NY groups).
    const firstPos = STOCK_REVISION_POS_COLUMNS[0]?.id;
    if (firstPos) ids.add(firstPos);
    return ids;
  }, [revisionGroups]);

  const data: StockRevenueV0 | null = sidecarState.status === "ok" ? sidecarState.data : null;

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
      const bucket = data?.revisions_table_stats?.[row];
      if (!bucket) return null;
      const v = bucket[fieldKey];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const pickRev = (row: "weighted" | "average" | "median", col: RevenueColumnDef | null) => {
      const fieldKey = col ? revenueColumnFieldKey(col, "growth") : "weight";
      return (
        fromEtl(row, fieldKey || undefined) ??
        clientSummaryForField(
          themes,
          col ? { kind: "rev", col } : { kind: "weight" },
          row,
        )
      );
    };
    const pickPos = (row: "weighted" | "average" | "median", col: PosCol) =>
      fromEtl(row, col.statsKey) ?? clientSummaryForField(themes, { kind: "pos", col }, row);

    return {
      note,
      weighted: {
        weight: pickRev("weighted", null),
        byRev: Object.fromEntries(revColumns.map((c) => [c.id, pickRev("weighted", c)])) as Record<
          string,
          number | null
        >,
        byPos: Object.fromEntries(
          STOCK_REVISION_POS_COLUMNS.map((c) => [c.id, pickPos("weighted", c)]),
        ) as Record<string, number | null>,
      },
      average: {
        weight: pickRev("average", null),
        byRev: Object.fromEntries(revColumns.map((c) => [c.id, pickRev("average", c)])) as Record<
          string,
          number | null
        >,
        byPos: Object.fromEntries(
          STOCK_REVISION_POS_COLUMNS.map((c) => [c.id, pickPos("average", c)]),
        ) as Record<string, number | null>,
      },
      median: {
        weight: pickRev("median", null),
        byRev: Object.fromEntries(revColumns.map((c) => [c.id, pickRev("median", c)])) as Record<
          string,
          number | null
        >,
        byPos: Object.fromEntries(
          STOCK_REVISION_POS_COLUMNS.map((c) => [c.id, pickPos("median", c)]),
        ) as Record<string, number | null>,
      },
    };
  }, [data, themes, revColumns]);

  const sortedRows = useMemo(() => {
    const themeRows: BodyRow[] = themes.map((theme) => ({ kind: "theme", theme }));
    const tickerRow: BodyRow = { kind: "ticker", revisions: data?.ticker_revisions };
    const primary = sorts[0]?.key;
    const cmp = (a: BodyRow, b: BodyRow) => {
      for (const s of sorts) {
        const va = rowSortValue(a, s.key, ticker, revColumns);
        const vb = rowSortValue(b, s.key, ticker, revColumns);
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
  }, [themes, data?.ticker_revisions, sorts, ticker, revColumns]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => toggleConstituentSort(prev, key, shiftKey));
  };

  const statusHint =
    sidecarState.status === "loading" || sidecarState.status === "idle"
      ? "Loading revenue revisions…"
      : sidecarState.status === "error"
        ? "Could not load revenue revisions — showing membership framework."
        : sidecarState.status === "absent" || !data
          ? "Revenue revisions not published yet — showing membership framework."
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
    bucket: {
      weight: number | null;
      byRev: Record<string, number | null>;
      byPos: Record<string, number | null>;
    },
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
      {revColumns.map((col) => {
        const value = bucket.byRev[col.id];
        const isMetric = col.id !== "rev_analysts";
        return (
          <td
            key={col.id}
            className={isMetric ? metricCellClass(col.id, groupStartIds) : tableStyles.analystsCol}
          >
            <strong>{formatRevenueCell(value, col, "growth")}</strong>
          </td>
        );
      })}
      {STOCK_REVISION_POS_COLUMNS.map((col) => (
        <td key={col.id} className={metricCellClass(col.id, groupStartIds)}>
          <strong>{formatPosPct(bucket.byPos[col.id])}</strong>
        </td>
      ))}
    </tr>
  );

  return (
    <>
      {statusHint ? <p className={styles.liveHint}>{statusHint}</p> : null}
      <div className={pageStyles.tableWrap}>
        <HorizontalScrollArea
          className={pageStyles.constituentsScrollWrap}
          data-constituents-view="revisions"
          tabIndex={0}
          role="region"
          aria-label="Theme revenue revisions — scroll horizontally to see all columns"
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
                  {analystsCol ? (
                    <th scope="col" className={tableStyles.analystsCol} title={analystsCol.tooltip}>
                      {renderSortHead(
                        analystsCol.id,
                        analystsCol.label.split("\n").map((line, i) => (
                          <span key={i}>
                            {i > 0 ? <br /> : null}
                            {line}
                          </span>
                        )),
                        analystsCol.tooltip,
                      )}
                    </th>
                  ) : null}
                  {metricColumns.map((col) => (
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
                  {STOCK_REVISION_POS_COLUMNS.map((col) => (
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
                        {revColumns.map((col) => {
                          const value = revenueCellValue(undefined, col, "growth", row.revisions);
                          const cls = revenueCellClass(value, col);
                          const isMetric = col.id !== "rev_analysts";
                          return (
                            <td
                              key={col.id}
                              className={
                                isMetric
                                  ? metricCellClass(col.id, groupStartIds, cls)
                                  : tableStyles.analystsCol
                              }
                            >
                              {formatRevenueCell(value, col, "growth")}
                            </td>
                          );
                        })}
                        {STOCK_REVISION_POS_COLUMNS.map((col) => (
                          <td key={col.id} className={metricCellClass(col.id, groupStartIds)}>
                            —
                          </td>
                        ))}
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
                      {revColumns.map((col) => {
                        const value = themeRevValue(t, col);
                        const cls = revenueCellClass(value, col);
                        const isMetric = col.id !== "rev_analysts";
                        return (
                          <td
                            key={col.id}
                            className={
                              isMetric
                                ? metricCellClass(col.id, groupStartIds, cls)
                                : tableStyles.analystsCol
                            }
                          >
                            {formatRevenueCell(value, col, "growth")}
                          </td>
                        );
                      })}
                      {STOCK_REVISION_POS_COLUMNS.map((col) => {
                        const value = themePosValue(t, col);
                        return (
                          <td key={col.id} className={metricCellClass(col.id, groupStartIds)}>
                            {formatPosPct(value)}
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
              ? "Columns match the theme Rev Revisions tab; % Pos CQ/CY/NY Δ transpose theme % Positive Tickers under those Rev Δ columns. Cells fill after the next revenue publish."
              : "Theme rows use each theme’s manual-weight revision summary. % Pos CQ/CY/NY Δ = theme % Positive Tickers under those Rev Δ columns."}
          </p>
          <ConstituentsTableSortHint showScrollHint />
          <TableFooterBrandMark className={pageStyles.tableWatermark} />
        </div>
      </div>
    </>
  );
}
