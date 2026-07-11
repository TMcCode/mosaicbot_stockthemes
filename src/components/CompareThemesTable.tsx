"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import pageStyles from "@/app/page.module.css";
import {
  buildSelectedDateLookup,
  metricColumnHeaderTooltip,
} from "@/lib/customDateColumnHelp";
import { isCompareEarningsColumn, type CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import { splitThemeDisplayName } from "@/lib/rotationThemeLabel";
import { compareColumnHeader, valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

import styles from "./CompareThemesTable.module.css";

type Row = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  /** Comma-separated tickers (+N); same ETL as group composition legend. */
  tickersPreview?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type DisplayRow = Row | CompareBenchmarkRow;

type SortState = { key: string; dir: "asc" | "desc" };

type Props = {
  benchmarkRows?: CompareBenchmarkRow[];
  rows: Row[];
  columns: string[];
  selectedDates?: ManifestSelectedDateV0[];
};

function isBenchmarkRow(row: DisplayRow): row is CompareBenchmarkRow {
  return "marketBaseline" in row && row.marketBaseline === true;
}

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function CompareThemesTable({
  benchmarkRows = [],
  rows,
  columns,
  selectedDates,
}: Props) {
  const [sorts, setSorts] = useState<SortState[]>([{ key: "10D", dir: "desc" }]);
  const selectedDateByKey = useMemo(
    () => buildSelectedDateLookup(selectedDates),
    [selectedDates],
  );

  const displayRows = useMemo(() => {
    const out: DisplayRow[] = [...benchmarkRows, ...rows];
    out.sort((a, b) => {
      for (const s of sorts) {
        if (s.key === "Theme") {
          const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
          continue;
        }
        const va = valueForTrendingColumn(s.key, a.compareReturns ?? undefined, {}, a.name);
        const vb = valueForTrendingColumn(s.key, b.compareReturns ?? undefined, {}, b.name);
        const aOk = va != null && Number.isFinite(va);
        const bOk = vb != null && Number.isFinite(vb);
        if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
        if (aOk !== bOk) return aOk ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return out;
  }, [benchmarkRows, rows, sorts]);

  const gridTemplateColumns = `var(--compare-theme-col) repeat(${columns.length}, minmax(76px, max-content))`;

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

  return (
    <section className={styles.wrap}>
      <div className={styles.hint}>Click a header to sort. Shift+click adds secondary sort.</div>

      <div className={styles.scrollWrap}>
        <div className={styles.table} style={{ gridTemplateColumns }}>
          <button
            type="button"
            className={`${styles.head} ${styles.sticky}`}
            onClick={(e) => onHeaderClick("Theme", e.shiftKey)}
          >
            Theme
          </button>
          {columns.map((col) => {
            const help = metricColumnHeaderTooltip(col, selectedDateByKey);
            return (
              <button
                key={`h-${col}`}
                type="button"
                className={styles.head}
                onClick={(e) => onHeaderClick(col, e.shiftKey)}
                title={help ?? compareColumnHeader(col)}
              >
                {compareColumnHeader(col)}
                {help ? (
                  <span
                    className={pageStyles.metricInfoAsterisk}
                    title={help}
                    aria-label={`${compareColumnHeader(col)} explanation`}
                  >
                    *
                  </span>
                ) : null}
              </button>
            );
          })}

          {displayRows.flatMap((row) => {
            const isBenchmark = isBenchmarkRow(row);
            const keyBase = row.slug || row.name;
            const { title, groupPrefix } = splitThemeDisplayName(row.name);
            const groupLine =
              groupPrefix ||
              (!isBenchmark ? String(row.groupName || "").trim() || null : null);
            const nameCell = isBenchmark ? (
              <div key={`${keyBase}-name`} className={`${styles.themeCell} ${styles.sticky}`}>
                <span className={styles.benchmarkName} title={row.name}>
                  {row.name}
                </span>
                {row.ticker ? (
                  <div className={styles.benchmarkMeta}>
                    {row.kind === "factor_spread"
                      ? `Factor spread · ${row.ticker}`
                      : `Benchmark · ${row.ticker}`}
                  </div>
                ) : row.kind === "factor_spread" ? (
                  <div className={styles.benchmarkMeta}>Factor spread</div>
                ) : null}
              </div>
            ) : (
              <div key={`${keyBase}-name`} className={`${styles.themeCell} ${styles.sticky}`}>
                {row.slug ? (
                  <Link href={`/themes/${row.slug}`} className={styles.themeName} title={row.name}>
                    {title}
                  </Link>
                ) : (
                  <span className={styles.themeName} title={row.name}>
                    {title}
                  </span>
                )}
                {groupLine ? <div className={styles.meta}>{groupLine}</div> : null}
              </div>
            );
            const valueCells = columns.map((col) => {
              const v =
                isBenchmark && isCompareEarningsColumn(col)
                  ? undefined
                  : valueForTrendingColumn(col, row.compareReturns ?? undefined, {}, row.name);
              const style =
                !isBenchmark && v != null && Number.isFinite(v)
                  ? trendingReturnHeatStyle(v)
                  : undefined;
              return (
                <div
                  key={`${keyBase}-${col}`}
                  className={`${styles.value} ${isBenchmark ? styles.benchmarkValue : ""}`}
                  style={style}
                >
                  {fmtPct(v)}
                </div>
              );
            });
            return [nameCell, ...valueCells];
          })}
        </div>
      </div>
    </section>
  );
}
