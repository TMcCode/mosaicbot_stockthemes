"use client";

import { type ReactNode, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
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
import { brandAssetPath } from "@/lib/siteUrl";
import {
  formatRevenueCell,
  mergeRevenueConstituents,
  REVENUE_REVISION_COLUMNS,
  REVENUE_STAT_ROW_LABELS,
  revenueCellClass,
  revenueCellValue,
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
            <thead>
              <tr>
                <th scope="col">{renderSortHead("company", "Company")}</th>
                {hasWeight ? <th scope="col">{renderSortHead("weight", "Wgt")}</th> : null}
                {columns.map((col) => (
                  <th key={col.id} scope="col">
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
                  <td>
                    <div className={styles.companyCell}>
                      <span className={styles.companyName}>{row.name?.trim() || "—"}</span>
                      <TickerBadge ticker={row.ticker} />
                    </div>
                  </td>
                  {hasWeight ? (
                    <td>{row.weight != null ? formatWeight(row.weight) : "—"}</td>
                  ) : null}
                  {columns.map((col) => {
                    const value = revenueCellValue(undefined, col, "growth", row.revenue.revisions);
                    const cls = revenueCellClass(value, col);
                    return (
                      <td
                        key={col.id}
                        className={
                          cls === "pos"
                            ? tableStyles.revenuePos
                            : cls === "neg"
                              ? tableStyles.revenueNeg
                              : undefined
                        }
                      >
                        {formatRevenueCell(value, col, "growth")}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className={tableStyles.themeReturnRow}>
                <td>
                  <strong className={tableStyles.themeReturnLabel} title="Manual theme-weight revision aggregate">
                    Theme revisions
                  </strong>
                </td>
                {hasWeight ? <td>—</td> : null}
                {columns.map((col) => {
                  const value = col.revisionKey ? summary[col.revisionKey] : null;
                  return (
                    <td key={col.id}>
                      <strong>{formatRevenueCell(value, col, "growth")}</strong>
                    </td>
                  );
                })}
              </tr>
              {STAT_ROWS.map((rowKey) => (
                <tr key={rowKey}>
                  <td>
                    <strong>{REVENUE_STAT_ROW_LABELS[rowKey]}</strong>
                  </td>
                  {hasWeight ? <td>—</td> : null}
                  {columns.map((col) => {
                    const value = revenueStatValue(statsBlock, rowKey, col, "growth");
                    return (
                      <td key={col.id}>
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
          Lock-quarter revenue estimate revisions vs prior-year actual. Theme row uses manual weights; footer stats
          are equal-weight.
        </p>
        <p className={tableStyles.sortHint}>
          Default: Wgt ↓ · Click headers to sort · Shift+click secondary
        </p>
        <div className={styles.tableWatermark} aria-hidden="true">
          <img src={brandAssetPath("/brand/logo-full-dark-tight.png")} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    </div>
  );
}
