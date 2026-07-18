"use client";

import { type ReactNode, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TickerBadge } from "@/components/TickerBadge";
import type { ThemeQualityRiskSidecarState } from "@/hooks/useThemeQualityRiskSidecar";
import {
  compareNullableNumbers,
  compareText,
  DEFAULT_CONSTITUENT_SORT,
  toggleConstituentSort,
  type ConstituentSortState,
} from "@/lib/constituentTableSort";
import { formatWeight } from "@/lib/formatWeight";
import { publicAssetPath } from "@/lib/siteUrl";
import {
  formatQualityRiskValue,
  mergeQualityRiskConstituents,
  QUALITY_RISK_STAT_ROW_LABELS,
  qualityRiskColumns,
  type QualityRiskColumnDef,
  type QualityRiskDisplayMode,
  type QualityRiskStatRowKey,
} from "@/lib/themeQualityRisk";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type Props = {
  detail: ThemeDetailV0;
  sidecarState: ThemeQualityRiskSidecarState;
};

type QualityRiskRow = ReturnType<typeof mergeQualityRiskConstituents>[number];

const STAT_ROWS: QualityRiskStatRowKey[] = [
  "average",
  "median",
  "std_dev",
  "min",
  "max",
  "positive_tickers_pct",
];

function compareRows(
  a: QualityRiskRow,
  b: QualityRiskRow,
  sorts: ConstituentSortState[],
  columns: QualityRiskColumnDef[],
): number {
  for (const sort of sorts) {
    if (sort.key === "company") {
      const compared = compareText(a.name?.trim() || a.ticker, b.name?.trim() || b.ticker, sort.dir);
      if (compared !== 0) return compared;
      continue;
    }
    if (sort.key === "weight") {
      const compared = compareNullableNumbers(a.weight, b.weight, sort.dir);
      if (compared !== 0) return compared;
      continue;
    }
    const column = columns.find((item) => item.id === sort.key);
    if (column) {
      const compared = compareNullableNumbers(
        column.getValue(a.metrics),
        column.getValue(b.metrics),
        sort.dir,
      );
      if (compared !== 0) return compared;
    }
  }
  return compareText(a.name?.trim() || a.ticker, b.name?.trim() || b.ticker, "asc");
}

function headerTooltip(column: QualityRiskColumnDef, rows: QualityRiskRow[], summary: QualityRiskRow["metrics"]) {
  const dates = new Set<string>();
  const summaryDate = column.getPeriod?.(summary);
  if (summaryDate) dates.add(summaryDate);
  for (const row of rows) {
    const date = column.getPeriod?.(row.metrics);
    if (date) dates.add(date);
  }
  const periodText = [...dates].sort().slice(0, 6).join(", ");
  return periodText ? `${column.tooltip} Period ends: ${periodText}.` : column.tooltip;
}

export default function ThemeConstituentsQualityRiskPanel({ detail, sidecarState }: Props) {
  const [mode, setMode] = useState<QualityRiskDisplayMode>("quarterly");
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((sort) => sort.key)), [sorts]);
  const columnLabels = sidecarState.status === "ok" ? sidecarState.data.column_labels : undefined;
  const columns = useMemo(
    () => qualityRiskColumns(mode, columnLabels),
    [columnLabels, mode],
  );

  const rows = useMemo(() => {
    if (sidecarState.status !== "ok") return [];
    return mergeQualityRiskConstituents(detail.constituents, sidecarState.data);
  }, [detail.constituents, sidecarState]);

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => compareRows(a, b, sorts, columns));
    return out;
  }, [columns, rows, sorts]);

  const hasWeight = detail.constituents.some(
    (constituent) => constituent.weight != null && Number.isFinite(constituent.weight),
  );

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((previous) => toggleConstituentSort(previous, key, shiftKey));
  };

  const renderSortHead = (key: string, label: ReactNode, title?: string) => (
    <button
      type="button"
      className={`${tableStyles.sortHead} ${activeSortKeys.has(key) ? tableStyles.sortHeadActive : ""}`}
      onClick={(event) => onHeaderClick(key, event.shiftKey)}
      onPointerDown={(event) => event.stopPropagation()}
      title={title}
    >
      {label}
    </button>
  );

  if (sidecarState.status === "idle" || sidecarState.status === "loading") {
    return <p className={styles.muted}>Loading quality and risk data…</p>;
  }
  if (sidecarState.status === "absent") {
    return <p className={styles.muted}>Quality and risk data is not available for this theme yet.</p>;
  }
  if (sidecarState.status === "error") {
    return <p className={styles.muted}>Could not load quality and risk data.</p>;
  }

  const data = sidecarState.data;
  const summary = data.summary ?? {};
  const stats = data.table_stats?.[mode];

  return (
    <>
      <div className={tableStyles.revenueToolbar}>
        <div className={tableStyles.toggle} role="group" aria-label="Quality and risk display mode">
          <button
            type="button"
            className={mode === "quarterly" ? tableStyles.active : undefined}
            aria-pressed={mode === "quarterly"}
            onClick={() => setMode("quarterly")}
          >
            Quarterly
          </button>
          <button
            type="button"
            className={mode === "fiscal_ebitda" ? tableStyles.active : undefined}
            aria-pressed={mode === "fiscal_ebitda"}
            onClick={() => setMode("fiscal_ebitda")}
          >
            Fiscal EBITDA
          </button>
          <button
            type="button"
            className={mode === "risk" ? tableStyles.active : undefined}
            aria-pressed={mode === "risk"}
            onClick={() => setMode("risk")}
          >
            Risk
          </button>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
          data-constituents-view="quality-risk"
          tabIndex={0}
          role="region"
          aria-label="Quality and risk table"
        >
          <div className={styles.constituentsTableSizer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">{renderSortHead("company", "Company")}</th>
                  {hasWeight ? <th scope="col">{renderSortHead("weight", "Wgt")}</th> : null}
                  {columns.map((column) => {
                    const tooltip = headerTooltip(column, rows, summary);
                    return (
                      <th key={column.id} scope="col" title={tooltip}>
                        {renderSortHead(
                          column.id,
                          column.label.split("\n").map((line, index) => (
                            <span key={line}>
                              {index > 0 ? <br /> : null}
                              {line}
                            </span>
                          )),
                          tooltip,
                        )}
                      </th>
                    );
                  })}
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
                    {hasWeight ? <td>{row.weight != null ? formatWeight(row.weight) : "—"}</td> : null}
                    {columns.map((column) => {
                      const kind = column.getKind?.(row.metrics);
                      const periodEnd = column.getPeriod?.(row.metrics);
                      return (
                        <td
                          key={column.id}
                          title={[
                            periodEnd ? `Period end ${periodEnd}` : "",
                            kind === "estimate" ? "Estimate" : kind === "actual" ? "Actual" : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || undefined}
                        >
                          {formatQualityRiskValue(column.getValue(row.metrics), column.format)}
                          {kind === "estimate" ? " E" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className={tableStyles.themeReturnRow}>
                  <td>
                    <strong className={tableStyles.themeReturnLabel} title="Manual theme-weight aggregate">
                      Theme quality
                    </strong>
                  </td>
                  {hasWeight ? <td>—</td> : null}
                  {columns.map((column) => (
                    <td key={column.id}>
                      <strong>
                        {formatQualityRiskValue(column.getValue(summary), column.format)}
                        {column.getKind?.(summary) === "estimate" ? " E" : ""}
                      </strong>
                    </td>
                  ))}
                </tr>
                {STAT_ROWS.map((rowKey) => (
                  <tr key={rowKey}>
                    <td>
                      <strong>{QUALITY_RISK_STAT_ROW_LABELS[rowKey]}</strong>
                    </td>
                    {hasWeight ? <td>—</td> : null}
                    {columns.map((column) => {
                      const value = stats?.[rowKey]?.[column.id];
                      return (
                        <td key={column.id}>
                          <strong>
                            {rowKey === "positive_tickers_pct" && value != null
                              ? `${Math.round(value)}%`
                              : formatQualityRiskValue(value, column.format)}
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
            Theme row uses manual weights; footer stats are equal-weight across constituents.
            {mode === "quarterly"
              ? " Q-3 through LQ and TTM use reported quarters only."
              : mode === "fiscal_ebitda"
                ? " E = estimate."
                : null}
          </p>
          <p className={tableStyles.sortHint}>
            Default: Wgt ↓ · Click headers to sort · Shift+click secondary
          </p>
          <div className={styles.tableWatermark} aria-hidden="true">
            <img
              src={publicAssetPath("/brand/logo-full-dark-tight.png")}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </>
  );
}
