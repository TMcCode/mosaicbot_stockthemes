"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import styles from "@/app/page.module.css";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { WatchlistStar } from "@/components/WatchlistStar";
import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import {
  trendingColumnHeader,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type HomeTrendingRow = {
  slug: string | null;
  name: string;
  marketBaseline?: boolean;
  compare_returns?: ThemeCompareReturnsV0;
  chartPerf: ChartPerfReturns;
};

type Props = {
  rows: HomeTrendingRow[];
  columns: string[];
  columnHelp: Record<string, string | undefined>;
  defaultSortKey: string;
};

type SortState = { key: string; dir: "asc" | "desc" };

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function compareRows(a: HomeTrendingRow, b: HomeTrendingRow, sorts: SortState[]): number {
  for (const s of sorts) {
    if (s.key === "Theme") {
      const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      continue;
    }
    const va = valueForTrendingColumn(s.key, a.compare_returns, a.chartPerf, a.name);
    const vb = valueForTrendingColumn(s.key, b.compare_returns, b.chartPerf, b.name);
    const aOk = va != null && Number.isFinite(va);
    const bOk = vb != null && Number.isFinite(vb);
    if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
    if (aOk !== bOk) return aOk ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function HomeTrendingThemesTable({ rows, columns, columnHelp, defaultSortKey }: Props) {
  const [sorts, setSorts] = useState<SortState[]>([{ key: defaultSortKey, dir: "desc" }]);
  const activeSortKeys = useMemo(() => new Set(sorts.map((s) => s.key)), [sorts]);

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => compareRows(a, b, sorts));
    return out;
  }, [rows, sorts]);

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

  const renderSortHead = (key: string, label: React.ReactNode, sticky?: boolean, title?: string) => (
    <button
      type="button"
      className={`${styles.trendingHead} ${styles.trendingSortHead} ${sticky ? styles.trendingSticky : ""} ${activeSortKeys.has(key) ? styles.trendingSortHeadActive : ""}`}
      onClick={(e) => onHeaderClick(key, e.shiftKey)}
      onPointerDown={(e) => e.stopPropagation()}
      title={title}
    >
      {label}
    </button>
  );

  return (
    <>
    <HorizontalScrollArea className={styles.trendingScrollWrap}>
      <div
        className={styles.trendingTable}
        style={{
          gridTemplateColumns: `var(--trending-theme-col) repeat(${columns.length}, minmax(var(--trending-value-col), max-content))`,
        }}
      >
        {renderSortHead("Theme", "Theme", true)}
        {columns.map((col) => (
          <Fragment key={`h-${col}`}>
            {renderSortHead(
              col,
              <>
                {trendingColumnHeader(col)}
                {columnHelp[col] ? (
                  <span
                    className={styles.metricInfoAsterisk}
                    title={columnHelp[col]}
                    aria-label={`${trendingColumnHeader(col)} explanation`}
                  >
                    *
                  </span>
                ) : null}
              </>,
              false,
              columnHelp[col] || col,
            )}
          </Fragment>
        ))}
        {sortedRows.flatMap((row) => {
          const keyBase = row.slug ?? `n-${row.name}`;
          const nameCell =
            row.slug != null ? (
              <div
                key={`${keyBase}-name`}
                className={`${styles.trendingThemeCell} ${styles.trendingSticky}`}
              >
                <div className={styles.trendingThemeRow}>
                  <WatchlistStar
                    compact
                    itemType="theme"
                    itemKey={row.slug}
                    label={row.name}
                    signInNext={`/themes/${row.slug}`}
                  />
                  <Link
                    href={`/themes/${row.slug}`}
                    className={styles.trendingThemeName}
                    title={row.name}
                  >
                    {row.name}
                  </Link>
                </div>
              </div>
            ) : (
              <div
                key={`${keyBase}-name`}
                className={`${styles.trendingThemeCell} ${styles.trendingSticky}`}
              >
                <span
                  className={styles.trendingThemeNameMuted}
                  title={row.name}
                  style={row.marketBaseline ? { fontWeight: 700 } : undefined}
                >
                  {row.name}
                </span>
              </div>
            );
          const cells = columns.map((col) => {
            const v = valueForTrendingColumn(col, row.compare_returns, row.chartPerf, row.name);
            const heat =
              v != null && Number.isFinite(v) ? trendingReturnHeatStyle(v) : undefined;
            return (
              <div key={`${keyBase}-${col}`} className={styles.trendingValue} style={heat}>
                {fmtPct(v)}
              </div>
            );
          });
          return [nameCell, ...cells];
        })}
      </div>
    </HorizontalScrollArea>
    <p className={styles.trendingSortHint}>
      Default: {trendingColumnHeader(defaultSortKey)} ↓ · Click headers to sort · Shift+click secondary
    </p>
    </>
  );
}
