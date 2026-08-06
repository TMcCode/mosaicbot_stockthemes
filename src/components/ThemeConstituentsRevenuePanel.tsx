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
import { brandAssetPath } from "@/lib/siteUrl";
import {
  buildAcceleratingNote,
  filterGrowthColumns,
  formatRevenueCell,
  mergeRevenueConstituents,
  REVENUE_STAT_ROW_LABELS,
  revenueCellClass,
  revenueCellValue,
  revenueStatValue,
  type RevenueColumnDef,
  type RevenueDisplayMode,
  type RevenueStatRowKey,
} from "@/lib/themeRevenue";
import type { ThemeDetailConstituentV0, ThemeDetailV0 } from "@/types/theme.detail.v0";
import type { ThemeRevenueMetricMapV0, ThemeRevenueV0 } from "@/types/theme.revenue.v0";

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

function compareRevenueRows(
  a: RevenueRow,
  b: RevenueRow,
  sorts: ConstituentSortState[],
  mode: RevenueDisplayMode,
  columns: RevenueColumnDef[],
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
    const col = columns.find((c) => c.id === s.key);
    if (col) {
      const metricsA = mode === "growth" ? a.revenue.growth : a.revenue.accel;
      const metricsB = mode === "growth" ? b.revenue.growth : b.revenue.accel;
      const cmp = compareNullableNumbers(
        revenueCellValue(metricsA, col, mode),
        revenueCellValue(metricsB, col, mode),
        s.dir,
      );
      if (cmp !== 0) return cmp;
    }
  }
  return compareText(a.name?.trim() || a.ticker, b.name?.trim() || b.ticker, "asc");
}

function RevenueFooterRows({
  columns,
  mode,
  data,
  hasWeight,
  themeLabel,
  themeMetrics,
}: {
  columns: RevenueColumnDef[];
  mode: RevenueDisplayMode;
  data: ThemeRevenueV0;
  hasWeight: boolean;
  themeLabel: string;
  themeMetrics: ThemeRevenueMetricMapV0;
}) {
  const statsBlock = mode === "growth" ? data.table_stats?.growth : data.table_stats?.accel;
  return (
    <>
      <tr className={tableStyles.themeReturnRow}>
        <td>
          <strong className={tableStyles.themeReturnLabel} title="Manual theme-weight aggregate">
            {themeLabel}
          </strong>
        </td>
        {hasWeight ? <td>—</td> : null}
        {columns.map((col) => {
          const value = revenueCellValue(themeMetrics, col, mode);
          return (
            <td key={col.id}>
              <strong>{formatRevenueCell(value, col, mode)}</strong>
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
            const value = revenueStatValue(statsBlock, rowKey, col, mode);
            return (
              <td key={col.id}>
                <strong>
                  {rowKey === "positive_tickers_pct" && value != null
                    ? `${Math.round(value)}%`
                    : formatRevenueCell(value, col, mode)}
                </strong>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export function ThemeConstituentsRevenuePanel({ detail, sidecarState }: Props) {
  const [mode, setMode] = useState<RevenueDisplayMode>("growth");
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const rows = useMemo(() => {
    if (sidecarState.status !== "ok") return [];
    return mergeRevenueConstituents(detail.constituents as ThemeDetailConstituentV0[], sidecarState.data);
  }, [sidecarState, detail.constituents]);

  const hasWeight = detail.constituents.some((c) => c.weight != null && Number.isFinite(c.weight));
  const columns = useMemo(() => filterGrowthColumns(mode), [mode]);

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => compareRevenueRows(a, b, sorts, mode, columns));
    return out;
  }, [rows, sorts, mode, columns]);

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
    return <p className={styles.muted}>Loading revenue estimates…</p>;
  }
  if (sidecarState.status === "absent") {
    return <p className={styles.muted}>Revenue estimates are not available for this theme yet.</p>;
  }
  if (sidecarState.status === "error") {
    return <p className={styles.muted}>Could not load revenue estimates.</p>;
  }

  const data = sidecarState.data;
  const acceleratingNote = buildAcceleratingNote(data);

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
        </div>
        {acceleratingNote ? (
          <p className={tableStyles.acceleratingNote} title={acceleratingNote}>
            {acceleratingNote}
          </p>
        ) : null}
      </div>
      <div className={styles.tableWrap}>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
          data-constituents-view="revenue"
          tabIndex={0}
          role="region"
          aria-label="Revenue table"
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
                {sortedRows.map((row) => {
                  const metrics = mode === "growth" ? row.revenue.growth : row.revenue.accel;
                  return (
                    <tr key={row.ticker}>
                      <td>
                        <div className={styles.companyCell}>
                          <ConstituentLogo ticker={row.ticker} />
                          <span className={styles.companyName}>{row.name?.trim() || "—"}</span>
                          <TickerBadge ticker={row.ticker} />
                        </div>
                      </td>
                      {hasWeight ? (
                        <td>{row.weight != null ? formatWeight(row.weight) : "—"}</td>
                      ) : null}
                      {columns.map((col) => {
                        const value = revenueCellValue(metrics, col, mode);
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
                            {formatRevenueCell(value, col, mode)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <RevenueFooterRows
                  columns={columns}
                  mode={mode}
                  data={data}
                  hasWeight={hasWeight}
                  themeLabel="Theme revenue"
                  themeMetrics={data.summary}
                />
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
        <div className={styles.tableFooter}>
          <p className={styles.tableFootnote}>
            Manual theme weights for the theme row; footer stats are equal-weight across constituents.
            {mode === "accel" ? " Accel = change in growth (percentage points)." : null}
          </p>
          <p className={tableStyles.sortHint}>
            Default: Wgt ↓ · Click headers to sort · Shift+click secondary
          </p>
          <div className={styles.tableWatermark} aria-hidden="true">
            <img src={brandAssetPath("/brand/logo-full-dark-tight.png")} alt="" loading="lazy" decoding="async" />
          </div>
        </div>
      </div>
    </>
  );
}
