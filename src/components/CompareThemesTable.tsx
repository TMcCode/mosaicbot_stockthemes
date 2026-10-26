"use client";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import pageStyles from "@/app/page.module.css";
import {
  buildSelectedDateLookup,
  metricColumnHeaderTooltip,
} from "@/lib/customDateColumnHelp";
import { isCompareEarningsColumn, type CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import { downloadCompareThemesCsv } from "@/lib/compareThemesCsv";
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
  themeCount?: number | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type DisplayRow = Row | CompareBenchmarkRow;

type SortState = { key: string; dir: "asc" | "desc" };

type Props = {
  benchmarkRows?: CompareBenchmarkRow[];
  rows: Row[];
  columns: string[];
  selectedDates?: ManifestSelectedDateV0[];
  entityKind?: "theme" | "group";
  toolbarStart?: ReactNode;
};

function isBenchmarkRow(row: DisplayRow): row is CompareBenchmarkRow {
  return "marketBaseline" in row && row.marketBaseline === true;
}

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

/** ~1.2k themes × 13 columns is ~45k nodes; mount in batches as the user scrolls. */
const ROWS_INITIAL = 120;
const ROWS_BATCH = 200;

export function CompareThemesTable({
  benchmarkRows = [],
  rows,
  columns,
  selectedDates,
  entityKind = "theme",
  toolbarStart,
}: Props) {
  const [sorts, setSorts] = useState<SortState[]>([{ key: "10D", dir: "desc" }]);
  const selectedDateByKey = useMemo(
    () => buildSelectedDateLookup(selectedDates),
    [selectedDates],
  );

  const displayRows = useMemo(() => {
    const out: DisplayRow[] = [...benchmarkRows, ...rows];
    // Precompute sort keys once — Array.sort comparisons call the comparator
    // O(n log n) times; valueForTrendingColumn can invert short-theme metrics.
    const sortVals = out.map((row) =>
      sorts.map((s) =>
        s.key === "Theme"
          ? undefined
          : valueForTrendingColumn(s.key, row.compareReturns ?? undefined, {}, row.name),
      ),
    );
    const order = out.map((_, i) => i);
    order.sort((ia, ib) => {
      for (let si = 0; si < sorts.length; si++) {
        const s = sorts[si];
        if (s.key === "Theme") {
          const cmp = out[ia].name.localeCompare(out[ib].name, undefined, {
            sensitivity: "base",
          });
          if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
          continue;
        }
        const va = sortVals[ia][si];
        const vb = sortVals[ib][si];
        const aOk = va != null && Number.isFinite(va);
        const bOk = vb != null && Number.isFinite(vb);
        if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
        if (aOk !== bOk) return aOk ? -1 : 1;
      }
      return out[ia].name.localeCompare(out[ib].name, undefined, { sensitivity: "base" });
    });
    return order.map((i) => out[i]);
  }, [benchmarkRows, rows, sorts]);

  const [renderLimit, setRenderLimit] = useState(ROWS_INITIAL);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollWrapRef = useRef<HTMLDivElement | null>(null);
  const hasMore = renderLimit < displayRows.length;
  const renderedRows = hasMore ? displayRows.slice(0, renderLimit) : displayRows;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setRenderLimit((n) => n + ROWS_BATCH);
      },
      { rootMargin: "1200px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, renderLimit, displayRows.length]);

  const gridTemplateColumns = `var(--compare-theme-col) repeat(${columns.length}, minmax(76px, max-content))`;

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    // After scroll-loading hundreds of rows, re-sorting remounts ~N×cols heat cells.
    // Collapse back to the first window + defer the React commit so the click stays snappy.
    scrollWrapRef.current?.scrollTo({ top: 0 });
    startTransition(() => {
      setRenderLimit(ROWS_INITIAL);
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
    });
  };

  const onDownload = () => {
    downloadCompareThemesCsv(displayRows, columns, { entityKind });
  };

  return (
    <section className={styles.wrap}>
      {toolbarStart ? <div className={styles.toolbarTop}>{toolbarStart}</div> : null}
      <div className={styles.toolbar}>
        <p className={styles.hint} style={{ fontSize: 8, lineHeight: 1.2, margin: 0, maxWidth: "none" }}>
          Click a header to sort. Shift+click adds secondary sort.
        </p>
        <button
          type="button"
          className={styles.downloadBtn}
          onClick={onDownload}
          disabled={displayRows.length === 0}
          title="Download filtered table as CSV"
          aria-label="Download filtered table as CSV"
        >
          <svg
            className={styles.downloadIcon}
            viewBox="0 0 24 24"
            width="13"
            height="13"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 3v10m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.scrollWrap} ref={scrollWrapRef}>
        <div className={styles.table} style={{ gridTemplateColumns }}>
          <button
            type="button"
            className={`${styles.head} ${styles.sticky}`}
            onClick={(e) => onHeaderClick("Theme", e.shiftKey)}
          >
            {entityKind === "group" ? "Group" : "Theme"}
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

          {renderedRows.flatMap((row) => {
            const isBenchmark = isBenchmarkRow(row);
            const keyBase = row.slug || row.name;
            const split =
              !isBenchmark && entityKind === "theme"
                ? splitThemeDisplayName(row.name)
                : { title: row.name, groupPrefix: null as string | null };
            const groupLine =
              !isBenchmark && entityKind === "theme"
                ? split.groupPrefix || String(row.groupName || "").trim() || null
                : null;
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
                  <Link
                    href={`/${entityKind === "group" ? "groups" : "themes"}/${row.slug}`}
                    className={styles.themeName}
                    title={row.name}
                  >
                    <span className={styles.themeNameFull}>{row.name}</span>
                    <span className={styles.themeNameShort}>{split.title}</span>
                  </Link>
                ) : (
                  <span className={styles.themeName} title={row.name}>
                    <span className={styles.themeNameFull}>{row.name}</span>
                    <span className={styles.themeNameShort}>{split.title}</span>
                  </span>
                )}
                {groupLine ? (
                  <div className={`${styles.meta} ${styles.groupMeta}`}>{groupLine}</div>
                ) : null}
                {row.tickersPreview ? (
                  <div className={`${styles.meta} ${styles.tickersMeta}`}>{row.tickersPreview}</div>
                ) : entityKind === "group" && row.themeCount != null ? (
                  <div className={styles.meta}>
                    {row.themeCount.toLocaleString()} {row.themeCount === 1 ? "theme" : "themes"}
                  </div>
                ) : null}
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
      {hasMore ? <div ref={sentinelRef} aria-hidden style={{ height: 1 }} /> : null}
    </section>
  );
}
