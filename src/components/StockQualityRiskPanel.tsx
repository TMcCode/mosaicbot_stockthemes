"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ConstituentsTableSortHint } from "@/components/ConstituentsTableSortHint";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import type { StockQualityRiskSidecarState } from "@/hooks/useStockQualityRiskSidecar";
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
  formatQualityRiskValue,
  qualityRiskColumns,
  type QualityRiskColumnDef,
  type QualityRiskDisplayMode,
} from "@/lib/themeQualityRisk";
import { weightedMeanRenormalized } from "@/lib/weightedMeanRenormalized";
import type {
  StockQualityRiskThemeRowV0,
  StockQualityRiskV0,
} from "@/types/stock.quality_risk.v0";
import type { ThemeQualityRiskMetricsV0 } from "@/types/theme.quality_risk.v0";

import pageStyles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";
import styles from "./StockLensPanels.module.css";

const WEIGHTED_THEMES_LABEL = "Weighted themes";
const WEIGHTED_TIP =
  "Weight-normalized blend of membership theme quality/risk metrics (ThemeWgt / Σw, renormalized over themes with a value).";
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
  sidecarState: StockQualityRiskSidecarState;
};

type BodyRow =
  | { kind: "ticker"; metrics: ThemeQualityRiskMetricsV0 | undefined }
  | { kind: "theme"; theme: StockQualityRiskThemeRowV0 };

function meanFinite(values: number[]): number | null {
  if (!values.length) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function colValue(
  metrics: ThemeQualityRiskMetricsV0 | undefined,
  col: QualityRiskColumnDef,
): number | null {
  const v = col.getValue(metrics);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function rowSortValue(
  row: BodyRow,
  key: string,
  tickerLabel: string,
  columns: QualityRiskColumnDef[],
): number | string | null {
  if (key === "theme") return row.kind === "ticker" ? tickerLabel : row.theme.name;
  if (key === "weight") {
    return row.kind === "theme" && row.theme.weight != null && Number.isFinite(row.theme.weight)
      ? row.theme.weight
      : null;
  }
  const col = columns.find((c) => c.id === key);
  if (!col) return null;
  return row.kind === "ticker"
    ? colValue(row.metrics, col)
    : colValue(row.theme.metrics, col);
}

export function StockQualityRiskPanel({ ticker, membershipThemes, sidecarState }: Props) {
  const [mode, setMode] = useState<QualityRiskDisplayMode>("quarterly");
  const [sorts, setSorts] = useState<ConstituentSortState[]>(DEFAULT_CONSTITUENT_SORT);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const data: StockQualityRiskV0 | null = sidecarState.status === "ok" ? sidecarState.data : null;

  const themes = useMemo((): StockQualityRiskThemeRowV0[] => {
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
  const columnLabels = data?.column_labels;

  const columns = useMemo(() => {
    const available = qualityRiskColumns(mode, columnLabels);
    if (mode !== "fiscal_ebitda") return available;
    return available.filter(
      (column) =>
        !column.id.endsWith("_gross_pct") ||
        column.getValue(data?.ticker_metrics) != null ||
        themes.some((t) => column.getValue(t.metrics) != null),
    );
  }, [mode, columnLabels, data?.ticker_metrics, themes]);

  /** Mint divider before EBITDA block (same as theme Gross | EBITDA grouping). */
  const groupStartIds = useMemo(() => {
    const ids = new Set<string>();
    if (mode === "quarterly") {
      ids.add("ttm_ebitda_pct");
    } else if (mode === "fiscal_ebitda") {
      const firstEbitda = columns.find((c) => c.id.endsWith("_ebitda_pct"));
      if (firstEbitda) ids.add(firstEbitda.id);
    }
    return ids;
  }, [mode, columns]);

  const metricCellClass = (colId: string) => {
    const parts = [tableStyles.metricCol];
    if (groupStartIds.has(colId)) parts.push(tableStyles.metricGroupStart);
    return parts.join(" ");
  };

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
      const bucket = data?.table_stats?.[mode]?.[row];
      if (!bucket) return null;
      const v = bucket[fieldKey];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const clientPick = (
      row: "weighted" | "average" | "median",
      col: QualityRiskColumnDef | null,
    ): number | null => {
      if (!col) {
        const weights = themes
          .map((t) => t.weight)
          .filter((w): w is number => typeof w === "number" && Number.isFinite(w));
        if (row === "weighted") return null;
        if (row === "average") return meanFinite(weights);
        return medianFinite(weights);
      }
      const pairs = themes.map((t) => ({
        weight: t.weight,
        value: colValue(t.metrics, col),
      }));
      const vals = pairs
        .map((p) => p.value)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (row === "weighted") return weightedMeanRenormalized(pairs);
      if (row === "average") return meanFinite(vals);
      return medianFinite(vals);
    };
    const pick = (row: "weighted" | "average" | "median", col: QualityRiskColumnDef | null) =>
      fromEtl(row, col?.id ?? "weight") ?? clientPick(row, col);

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
        const va = rowSortValue(a, s.key, ticker, columns);
        const vb = rowSortValue(b, s.key, ticker, columns);
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
  }, [themes, data?.ticker_metrics, sorts, ticker, columns]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => toggleConstituentSort(prev, key, shiftKey));
  };

  const statusHint =
    sidecarState.status === "loading" || sidecarState.status === "idle"
      ? "Loading quality and risk data…"
      : sidecarState.status === "error"
        ? "Could not load quality and risk data — showing membership framework."
        : sidecarState.status === "absent" || !data
          ? "Quality and risk metrics not published yet — showing membership framework."
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
        <td className={`${tableStyles.metaCol} ${styles.wgtCell}`}>
          {bucket.weight != null ? formatWeight(bucket.weight) : "—"}
        </td>
      ) : null}
      {columns.map((col) => (
        <td key={col.id} className={metricCellClass(col.id)}>
          <strong>{formatQualityRiskValue(bucket.byCol[col.id], col.format)}</strong>
        </td>
      ))}
    </tr>
  );

  return (
    <>
      <div className={tableStyles.revenueToolbar}>
        <div className={tableStyles.toggleScroll}>
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
              Fiscal Margins
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
      </div>
      {statusHint ? <p className={styles.liveHint}>{statusHint}</p> : null}
      <div className={pageStyles.tableWrap}>
        <HorizontalScrollArea
          className={pageStyles.constituentsScrollWrap}
          data-constituents-view="quality-risk"
          scrollResetKey={mode}
          tabIndex={0}
          role="region"
          aria-label="Theme quality and risk — scroll horizontally to see all columns"
        >
          <div className={pageStyles.constituentsTableSizer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">{renderSortHead("theme", "Theme")}</th>
                  {hasWeight ? (
                    <th scope="col" className={tableStyles.metaCol}>
                      {renderSortHead("weight", "Wgt")}
                    </th>
                  ) : null}
                  {columns.map((col) => (
                    <th key={col.id} scope="col" className={metricCellClass(col.id)} title={col.tooltip}>
                      {renderSortHead(
                        col.id,
                        col.label.split("\n").map((line, i) => (
                          <span key={line}>
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
                        {hasWeight ? <td className={tableStyles.metaCol}>—</td> : null}
                        {columns.map((col) => {
                          const kind = col.getKind?.(row.metrics);
                          const periodEnd = col.getPeriod?.(row.metrics);
                          return (
                            <td
                              key={col.id}
                              className={metricCellClass(col.id)}
                              title={
                                [periodEnd ? `Period end ${periodEnd}` : "", kind === "estimate" ? "Estimate" : ""]
                                  .filter(Boolean)
                                  .join(" · ") || undefined
                              }
                            >
                              {formatQualityRiskValue(colValue(row.metrics, col), col.format)}
                              {kind === "estimate" ? " E" : ""}
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
                        <td className={`${tableStyles.metaCol} ${styles.wgtCell}`}>
                          {t.weight != null && Number.isFinite(t.weight)
                            ? formatWeight(t.weight)
                            : "—"}
                        </td>
                      ) : null}
                      {columns.map((col) => {
                        const kind = col.getKind?.(t.metrics);
                        const periodEnd = col.getPeriod?.(t.metrics);
                        return (
                          <td
                            key={col.id}
                            className={metricCellClass(col.id)}
                            title={
                              [periodEnd ? `Period end ${periodEnd}` : "", kind === "estimate" ? "Estimate" : ""]
                                .filter(Boolean)
                                .join(" · ") || undefined
                            }
                          >
                            {formatQualityRiskValue(colValue(t.metrics, col), col.format)}
                            {kind === "estimate" ? " E" : ""}
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
              ? "Columns match the theme Quality & Risk tab; cells fill after the next quality-risk publish."
              : "Theme: manual weights; footer: membership Weighted / Average / Median."}
            {mode === "quarterly"
              ? " Quarters/TTM: reported only."
              : mode === "fiscal_ebitda"
                ? " GM: reported; E = EBITDA est."
                : null}
          </p>
          <ConstituentsTableSortHint showScrollHint />
          <TableFooterBrandMark className={pageStyles.tableWatermark} />
        </div>
      </div>
    </>
  );
}
