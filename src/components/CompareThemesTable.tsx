"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  trendingColumnHeader,
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
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type SortState = { key: string; dir: "asc" | "desc" };

type Props = {
  rows: Row[];
  columns: string[];
  groupOptions: string[];
  yearOptions: string[];
};

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function deriveYearTag(name: string): string | null {
  const m = String(name || "").match(/'(\d{2})\b/);
  return m ? m[1] : null;
}

export function CompareThemesTable({ rows, columns, groupOptions, yearOptions }: Props) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [sorts, setSorts] = useState<SortState[]>([{ key: "10D", dir: "desc" }]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (selectedGroups.length > 0) {
        const g = String(r.groupName || "");
        if (!selectedGroups.includes(g)) return false;
      }
      if (selectedYears.length > 0) {
        const y = deriveYearTag(r.name);
        if (!y || !selectedYears.includes(y)) return false;
      }
      return true;
    });
  }, [rows, selectedGroups, selectedYears]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      for (const s of sorts) {
        if (s.key === "Theme") {
          const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
          continue;
        }
        const va = valueForTrendingColumn(s.key, a.compareReturns ?? undefined, {});
        const vb = valueForTrendingColumn(s.key, b.compareReturns ?? undefined, {});
        const aOk = va != null && Number.isFinite(va);
        const bOk = vb != null && Number.isFinite(vb);
        if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
        if (aOk !== bOk) return aOk ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return out;
  }, [filtered, sorts]);

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
      <div className={styles.toolbar}>
        <label className={styles.control}>
          <span>Groups</span>
          <select
            multiple
            value={selectedGroups}
            onChange={(e) =>
              setSelectedGroups(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
          >
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.control}>
          <span>Years</span>
          <select
            multiple
            value={selectedYears}
            onChange={(e) =>
              setSelectedYears(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.hint}>Click a header to sort. Shift+click adds secondary sort.</div>

      <div className={styles.scrollWrap}>
        <div
          className={styles.table}
          style={{
            gridTemplateColumns: `minmax(260px, max-content) repeat(${columns.length}, minmax(84px, max-content))`,
          }}
        >
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
              title={trendingColumnHeader(col)}
            >
              {trendingColumnHeader(col)}
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
                {row.groupName ? <div className={styles.meta}>{row.groupName}</div> : null}
              </div>
            );
            const valueCells = columns.map((col) => {
              const v = valueForTrendingColumn(col, row.compareReturns ?? undefined, {});
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
