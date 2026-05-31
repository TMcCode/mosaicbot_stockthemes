"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { buildSelectedDateLookup, metricColumnHeaderTooltip } from "@/lib/customDateColumnHelp";
import { formatUsdMarketCap } from "@/lib/constituentMeta";
import type { GroupThemeTableRow } from "@/lib/groupThemesTable";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import {
  trendingColumnHeader,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import styles from "@/app/page.module.css";
import localStyles from "@/components/GroupThemesTable.module.css";

type Props = {
  rows: GroupThemeTableRow[];
  metricColumns: string[];
  selectedDates?: ManifestSelectedDateV0[];
};

type SortState = { key: string; dir: "asc" | "desc" };

const DEFAULT_SORTS: SortState[] = [{ key: "10D", dir: "desc" }];

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function metricHeaderLabel(col: string): string {
  return col === "Period" ? "1Yr %" : trendingColumnHeader(col);
}

function numericField(
  row: GroupThemeTableRow,
  key: string,
): number | null | undefined {
  if (key === "Tickers") return row.ticker_count;
  if (key === "Avg MCap") return row.avg_market_cap_usd;
  if (key === "Total MCap") return row.total_market_cap_usd;
  return valueForTrendingColumn(key, row.compare_returns ?? undefined, {}, row.name);
}

function compareRows(a: GroupThemeTableRow, b: GroupThemeTableRow, sorts: SortState[]): number {
  for (const s of sorts) {
    if (s.key === "Theme") {
      const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      continue;
    }
    const va = numericField(a, s.key);
    const vb = numericField(b, s.key);
    const aOk = va != null && Number.isFinite(va);
    const bOk = vb != null && Number.isFinite(vb);
    if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
    if (aOk !== bOk) return aOk ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function GroupThemesTable({ rows, metricColumns, selectedDates }: Props) {
  const [sorts, setSorts] = useState<SortState[]>(DEFAULT_SORTS);
  const selectedDateByKey = buildSelectedDateLookup(selectedDates);

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => compareRows(a, b, sorts));
    return out;
  }, [rows, sorts]);

  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const nextDir = idx >= 0 && prev[idx].dir === "desc" ? "asc" : "desc";
      if (!shiftKey) return [{ key, dir: nextDir }];
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { key, dir: nextDir };
        return copy;
      }
      return [...prev, { key, dir: nextDir }];
    });
  };

  const renderSortHead = (key: string, label: string, title?: string) => (
    <button
      type="button"
      className={`${localStyles.sortHead} ${activeSortKeys.has(key) ? localStyles.sortHeadActive : ""}`}
      onClick={(e) => onHeaderClick(key, e.shiftKey)}
      title={title}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className={styles.tableWrap}>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
          tabIndex={0}
          role="region"
          aria-label="Themes in group — scroll horizontally to see all columns"
        >
          <div className={styles.constituentsTableSizer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">{renderSortHead("Theme", "Theme")}</th>
                  <th scope="col">{renderSortHead("Tickers", "Tickers")}</th>
                  <th scope="col">{renderSortHead("Avg MCap", "Avg MCap")}</th>
                  <th scope="col">{renderSortHead("Total MCap", "Total MCap")}</th>
                  {metricColumns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      title={metricColumnHeaderTooltip(col, selectedDateByKey)}
                    >
                      {renderSortHead(
                        col,
                        metricHeaderLabel(col),
                        metricColumnHeaderTooltip(col, selectedDateByKey),
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.slug}>
                    <td>
                      <Link href={`/themes/${row.slug}`} className={styles.name} prefetch={false}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.ticker_count != null ? row.ticker_count.toLocaleString() : "—"}</td>
                    <td>{formatUsdMarketCap(row.avg_market_cap_usd)}</td>
                    <td>{formatUsdMarketCap(row.total_market_cap_usd)}</td>
                    {metricColumns.map((col) => {
                      const v = valueForTrendingColumn(
                        col,
                        row.compare_returns ?? undefined,
                        {},
                        row.name,
                      );
                      const heat =
                        v != null && Number.isFinite(v) ? trendingReturnHeatStyle(v) : undefined;
                      return (
                        <td key={`${row.slug}-${col}`} style={heat}>
                          {fmtPct(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
      </div>
      <p className={localStyles.sortHint}>
        Default: 10D ↓ · Click headers to sort · Shift+click secondary
      </p>
    </>
  );
}
