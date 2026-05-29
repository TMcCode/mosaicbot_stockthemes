"use client";

import Link from "next/link";

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
};

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function HomeTrendingThemesTable({ rows, columns, columnHelp }: Props) {
  return (
    <HorizontalScrollArea className={styles.trendingScrollWrap}>
      <div
        className={styles.trendingTable}
        style={{
          gridTemplateColumns: `var(--trending-theme-col) repeat(${columns.length}, minmax(var(--trending-value-col), max-content))`,
        }}
      >
        <div className={`${styles.trendingHead} ${styles.trendingSticky}`}>Theme</div>
        {columns.map((col) => (
          <div
            key={`h-${col}`}
            className={styles.trendingHead}
            title={columnHelp[col] || col}
          >
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
          </div>
        ))}
        {rows.flatMap((row) => {
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
  );
}
