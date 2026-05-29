"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  compareColumnHeader,
  compareColumnHeaderTooltip,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
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

type SortState = { key: string; dir: "asc" | "desc" };

type Props = {
  rows: Row[];
  columns: string[];
};

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function CompareThemesTable({ rows, columns }: Props) {
  const [sorts, setSorts] = useState<SortState[]>([{ key: "10D", dir: "desc" }]);

  const sorted = useMemo(() => {
    const out = [...rows];
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
  }, [rows, sorts]);

  const gridTemplateColumns = `minmax(240px, max-content) repeat(${columns.length}, minmax(76px, max-content))`;

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
          {columns.map((col) => (
            <button
              key={`h-${col}`}
              type="button"
              className={styles.head}
              onClick={(e) => onHeaderClick(col, e.shiftKey)}
              title={compareColumnHeaderTooltip(col) ?? compareColumnHeader(col)}
            >
              {compareColumnHeader(col)}
            </button>
          ))}

          {sorted.flatMap((row) => {
            const keyBase = row.slug || row.name;
            const nameCell = (
              <div key={`${keyBase}-name`} className={`${styles.themeCell} ${styles.sticky}`}>
                {row.slug ? (
                  <Link href={`/themes/${row.slug}`} className={styles.themeName}>
                    {row.name}
                  </Link>
                ) : (
                  <span className={styles.themeName}>{row.name}</span>
                )}
                {row.tickersPreview ? (
                  <div className={styles.meta}>{row.tickersPreview}</div>
                ) : row.groupName ? (
                  <div className={styles.meta}>{row.groupName}</div>
                ) : null}
              </div>
            );
            const valueCells = columns.map((col) => {
              const v = valueForTrendingColumn(col, row.compareReturns ?? undefined, {}, row.name);
              const style = v != null && Number.isFinite(v) ? trendingReturnHeatStyle(v) : undefined;
              return (
                <div key={`${keyBase}-${col}`} className={styles.value} style={style}>
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
