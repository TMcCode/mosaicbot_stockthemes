"use client";

import { type ReactNode, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { ConstituentLogo } from "@/components/ConstituentLogo";
import { TickerBadge } from "@/components/TickerBadge";
import type { ThemeRevenueSidecarState } from "@/hooks/useThemeRevenueSidecar";
import {
  compareNullableNumbers,
  compareText,
  DEFAULT_CONSTITUENT_SORT,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { formatWeight } from "@/lib/formatWeight";
import { ConstituentsTableSortHint } from "@/components/ConstituentsTableSortHint";
import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import {
  formatRevenueCell,
  mergeRevenueConstituents,
  REVENUE_REVISION_COLUMNS,
  REVENUE_REVISION_GROUPS,
  REVENUE_STAT_ROW_LABELS,
  revenueCellClass,
  revenueCellValue,
  revenueGroupStartColumnIds,
  revenueStatValue,
  type RevenueStatRowKey,
} from "@/lib/themeRevenue";
import type { ThemeDetailConstituentV0, ThemeDetailV0 } from "@/types/theme.detail.v0";
import type { ThemeRevenueRevisionsV0 } from "@/types/theme.revenue.v0";

type Props = {
  detail: ThemeDetailV0;
  sidecarState: ThemeRevenueSidecarState;
};

type RevenueRow = ReturnType<typeof mergeRevenueConstituents>[number];

const STAT_ROWS: RevenueStatRowKey[] = [
  "average",
  "median",
  "std_dev",
  "min",
  "max",
  "positive_tickers_pct",
];

function compareRevisionRows(
  a: RevenueRow,
  b: RevenueRow,
  sorts: ConstituentSortState[],
): number {
  for (const s of sorts) {
    if (s.key === "company") {
      const cmp = compareText(a.name?.trim() || a.ticker, b.name?.trim() || b.ticker, s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    if (s.key === "weight") {
      const cmp = compareNullableNumbers(a.weight, b.weight, s.dir);
      if (cmp !== 0) return cmp;
      continue;
    }
    const col = REVENUE_REVISION_COLUMNS.find((c) => c.id === s.key);
    if (col) {
      const cmp = compareNullableNumbers(
        revenueCellValue(undefined, col, "growth", a.revenue.revisions),
        revenueCellValue(undefined, col, "growth", b.revenue.revisions),
        s.dir,
      );
      if (cmp !== 0) return cmp;
    }
  }
  return compareText(a.name?.trim() || a.ticker, b.name?.trim() || b.ticker, "asc");
}

export function ThemeConstituentsRevisionsPanel({ detail, sidecarState }: Props) {
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const rows = useMemo(() => {
    if (sidecarState.status !== "ok") return [];
    return mergeRevenueConstituents(detail.constituents as ThemeDetailConstituentV0[], sidecarState.data);
  }, [sidecarState, detail.constituents]);

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => compareRevisionRows(a, b, sorts));
    return out;
  }, [rows, sorts]);

  const hasWeight = detail.constituents.some((c) => c.weight != null && Number.isFinite(c.weight));
  const columns = REVENUE_REVISION_COLUMNS;

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

  if (sidecarState.status === "idle" || sidecarState.status === "loading") {
    return <p className={styles.muted}>Loading revenue revisions…</p>;
  }
  if (sidecarState.status === "absent") {
    return <p className={styles.muted}>Revenue revisions are not available for this theme yet.</p>;
  }
  if (sidecarState.status === "error") {
    return <p className={styles.muted}>Could not load revenue revisions.</p>;
  }

  const data = sidecarState.data;
  const statsBlock = data.table_stats?.revisions;
  const summary = data.summary_revisions ?? ({} as ThemeRevenueRevisionsV0);
  const analystsCol = columns.find((c) => c.id === "rev_analysts");
  const metricColumns = columns.filter((c) => c.id !== "rev_analysts");
  const groupStartIds = revenueGroupStartColumnIds(REVENUE_REVISION_GROUPS);

  const metricCellClass = (colId: string, tone?: string) => {
    const parts = [tableStyles.metricCol];
    if (groupStartIds.has(colId)) parts.push(tableStyles.metricGroupStart);
    if (tone === "pos") parts.push(tableStyles.revenuePos);
    if (tone === "neg") parts.push(tableStyles.revenueNeg);
    return parts.join(" ");
  };

  return (
    <div className={styles.tableWrap}>
      <HorizontalScrollArea
        className={styles.constituentsScrollWrap}
        data-constituents-view="revisions"
        tabIndex={0}
        role="region"
        aria-label="Revenue revisions table"
      >
        <div className={styles.constituentsTableSizer}>
          <table className={styles.dataTable}>
            <colgroup>
              <col className={tableStyles.companyCol} />
              {hasWeight ? <col className={tableStyles.metaCol} /> : null}
              {analystsCol ? <col className={tableStyles.analystsCol} /> : null}
              {metricColumns.map((col) => (
                <col key={col.id} className={tableStyles.metricCol} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className={`${tableStyles.companyCol} ${tableStyles.companySticky}`}
                >
                  {renderSortHead("company", "Company")}
                </th>
                {hasWeight ? (
                  <th scope="col" className={tableStyles.metaCol}>
                    {renderSortHead("weight", "Wgt")}
                  </th>
                ) : null}
                {analystsCol ? (
                  <th scope="col" className={tableStyles.analystsCol}>
                    {renderSortHead(
                      analystsCol.id,
                      analystsCol.label.split("\n").map((line, i) => (
                        <span key={line}>
                          {i > 0 ? <br /> : null}
                          {line}
                        </span>
                      )),
                      analystsCol.tooltip,
                    )}
                  </th>
                ) : null}
                {metricColumns.map((col) => (
                  <th key={col.id} scope="col" className={metricCellClass(col.id)}>
                    {renderSortHead(
                      col.id,
                      col.label.split("\n").map((line, i) => (
                        <span key={line}>
                          {i > 0 ? <br /> : null}
                          {line}
                        </span>
                      )),
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.ticker}>
                  <td className={`${tableStyles.companyCol} ${tableStyles.companySticky}`}>
                    <div className={styles.companyCell}>
                      <ConstituentLogo ticker={row.ticker} />
                      <span className={styles.companyName} title={row.name?.trim() || undefined}>
                        {row.name?.trim() || "—"}
                      </span>
                      <TickerBadge ticker={row.ticker} />
                    </div>
                  </td>
                  {hasWeight ? (
                    <td className={tableStyles.metaCol}>
                      {row.weight != null ? formatWeight(row.weight) : "—"}
                    </td>
                  ) : null}
                  {columns.map((col) => {
                    const value = revenueCellValue(undefined, col, "growth", row.revenue.revisions);
                    const cls = revenueCellClass(value, col);
                    const isMetric = col.id !== "rev_analysts";
                    return (
                      <td
                        key={col.id}
                        className={
                          isMetric
                            ? metricCellClass(col.id, cls)
                            : tableStyles.analystsCol
                        }
                      >
                        {formatRevenueCell(value, col, "growth")}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className={tableStyles.themeReturnRow}>
                <td className={`${tableStyles.companyCol} ${tableStyles.companySticky}`}>
                  <strong className={tableStyles.themeReturnLabel} title="Manual theme-weight revision aggregate">
                    Theme revisions
                  </strong>
                </td>
                {hasWeight ? <td className={tableStyles.metaCol}>—</td> : null}
                {columns.map((col) => {
                  const value = col.revisionKey ? summary[col.revisionKey] : null;
                  const isMetric = col.id !== "rev_analysts";
                  return (
                    <td
                      key={col.id}
                      className={isMetric ? metricCellClass(col.id) : tableStyles.analystsCol}
                    >
                      <strong>{formatRevenueCell(value, col, "growth")}</strong>
                    </td>
                  );
                })}
              </tr>
              {STAT_ROWS.map((rowKey) => (
                <tr key={rowKey}>
                  <td className={`${tableStyles.companyCol} ${tableStyles.companySticky}`}>
                    <strong>{REVENUE_STAT_ROW_LABELS[rowKey]}</strong>
                  </td>
                  {hasWeight ? <td className={tableStyles.metaCol}>—</td> : null}
                  {columns.map((col) => {
                    const value = revenueStatValue(statsBlock, rowKey, col, "growth");
                    const isMetric = col.id !== "rev_analysts";
                    return (
                      <td
                        key={col.id}
                        className={isMetric ? metricCellClass(col.id) : tableStyles.analystsCol}
                      >
                        <strong>
                          {rowKey === "positive_tickers_pct" && value != null
                            ? `${Math.round(value)}%`
                            : formatRevenueCell(value, col, "growth")}
                        </strong>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HorizontalScrollArea>
      <div className={styles.tableFooter}>
        <p className={styles.tableFootnote}>
          CQ / CY / NY consensus growth revisions vs prior year. Theme: manual weights;
          footer: equal-weight.
        </p>
        <ConstituentsTableSortHint />
        <TableFooterBrandMark className={styles.tableWatermark} />
      </div>
    </div>
  );
}
