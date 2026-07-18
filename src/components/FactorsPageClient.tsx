"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FactorChartSeries } from "@/components/FactorTrendChart";
import { factorDisplayLabel } from "@/lib/factorDisplayLabel";
import type { FactorMethodologyItem } from "@/lib/loadFactorMethodology";
import { loadFactorIndex } from "@/lib/loadFactorIndex";
import { loadFactorRows } from "@/lib/loadFactorRows";
import { loadFactorTimeseries } from "@/lib/loadFactorTimeseries";
import { applyShortThemePerformanceDisplay } from "@/lib/shortThemeChart";
import {
  priceReturnsRevalidateSeconds,
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { FactorIndexV0 } from "@/types/factor_index.v0";
import type { FactorTimeseriesV0 } from "@/types/factor_timeseries.v0";
import styles from "@/components/FactorsPageClient.module.css";

type Props = {
  dataBaseUrl: string;
  factorMethodology: Record<string, FactorMethodologyItem>;
};

function factorOptions(payload: FactorIndexV0): Array<{ id: string; label: string }> {
  return Object.entries(payload.factors)
    .map(([id, b]) => ({
      id,
      label: factorDisplayLabel(id, typeof b?.label === "string" ? b.label : undefined),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

type ScoreMode = "standalone" | "incremental";

const SCORE_MODE_COPY: Record<
  ScoreMode,
  { label: string; description: string; scoreColumnTooltip: string }
> = {
  standalone: {
    label: "Co-movement",
    description:
      "Higher rank means stronger positive exposure. Ranks by how closely a theme’s daily returns track this factor’s ETF spread on its own—no adjustment for market, growth, sector, or other factors. Matches the chart compare line.",
    scoreColumnTooltip:
      "Co-movement score (0–100): how closely the theme’s daily returns track this factor’s ETF spread on its own. Higher = stronger positive exposure.",
  },
  incremental: {
    label: "Incremental",
    description:
      "Higher rank means stronger positive exposure. Ranks by exposure that remains after the model removes overlap with the broad market, growth, sectors, and other factors—how much this theme still leans this factor beyond those drivers.",
    scoreColumnTooltip:
      "Incremental score (0–100): exposure left after market, growth, sector, and other factors are removed. Higher = stronger positive exposure.",
  },
};

type DisplayRow = {
  theme: string;
  slug?: string | null;
  rank: number;
  rankStandalone?: number | null;
  total: number;
  score?: number | null;
  scoreStandalone?: number | null;
  confidence?: number | null;
  corr63d?: number | null;
  corr252d?: number | null;
};

function rowRank(row: DisplayRow, mode: ScoreMode): number {
  if (mode === "standalone" && row.rankStandalone != null && Number.isFinite(row.rankStandalone)) {
    return row.rankStandalone;
  }
  return row.rank;
}

function rowScore(row: DisplayRow, mode: ScoreMode): number | null {
  if (mode === "standalone" && row.scoreStandalone != null && Number.isFinite(row.scoreStandalone)) {
    return row.scoreStandalone;
  }
  return row.score ?? null;
}

type SortColumn = "rank" | "theme" | "score" | "altScore";
type SortDir = "asc" | "desc";
type TableSort = { column: SortColumn; direction: SortDir };

function altScore(row: DisplayRow, mode: ScoreMode): number | null {
  if (mode === "standalone") return row.score ?? null;
  return row.scoreStandalone ?? null;
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function sortDisplayRows(rows: DisplayRow[], sort: TableSort, mode: ScoreMode): DisplayRow[] {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort.column) {
      case "rank":
        cmp = rowRank(a, mode) - rowRank(b, mode);
        break;
      case "theme":
        cmp = a.theme.localeCompare(b.theme, undefined, { sensitivity: "base" });
        break;
      case "score":
        cmp = compareNullableNumbers(rowScore(a, mode), rowScore(b, mode));
        break;
      case "altScore":
        cmp = compareNullableNumbers(altScore(a, mode), altScore(b, mode));
        break;
    }
    if (cmp !== 0) return cmp * dir;
    return a.theme.localeCompare(b.theme, undefined, { sensitivity: "base" });
  });
}

function nextTableSort(column: SortColumn, current: TableSort): TableSort {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  const defaultDir: SortDir =
    column === "theme" || column === "rank" ? "asc" : "desc";
  return { column, direction: defaultDir };
}

function sortAriaLabel(column: SortColumn, sort: TableSort, label: string): string {
  if (sort.column !== column) return `Sort by ${label}`;
  return `Sort by ${label}, currently ${sort.direction === "asc" ? "ascending" : "descending"}`;
}

type ThemeChartSeries = {
  slug: string;
  theme: string;
  dates: string[];
  values: number[];
  /** Bust client cache when compare transform logic changes. */
  _transformVersion?: number;
};

/** Bump to refetch theme compare lines (e.g. short-theme inversion fix). */
const THEME_COMPARE_TRANSFORM_VERSION = 2;

const COMPARE_COLORS = [
  "#7c9cff",
  "#ffb84d",
  "#ff6b9d",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#22d3ee",
  "#c4b5fd",
  "#fb7185",
  "#4ade80",
  "#fcd34d",
  "#60a5fa",
];
const FACTOR_LINE_COLOR = "#26fcd6";

const FactorTrendChart = dynamic(
  () => import("@/components/FactorTrendChart").then((mod) => mod.FactorTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className={styles.factorChartCanvasWrap} aria-busy="true" aria-label="Loading chart">
        <div className={styles.factorChartCanvas} />
      </div>
    ),
  },
);

function normalizeRows(rawEntries: unknown[]): DisplayRow[] {
  if (!rawEntries.length) return [];
  const totalFallback = rawEntries.length;
  return rawEntries
    .map((raw, idx) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const theme = typeof row.theme === "string" ? row.theme : "";
      if (!theme) return null;
      const rankNum = Number(row.rank);
      const totalNum = Number(row.total);
      const scoreNum = Number(row.score);
      const confNum = Number(row.confidence);
      const rankStandaloneNum = Number(row.rank_standalone);
      const scoreStandaloneNum = Number(row.score_standalone);
      const corr63Num = Number(row.corr_63d);
      const corr252Num = Number(row.corr_252d);
      return {
        theme,
        slug: typeof row.slug === "string" ? row.slug : null,
        rank: Number.isFinite(rankNum) && rankNum > 0 ? Math.floor(rankNum) : idx + 1,
        rankStandalone:
          Number.isFinite(rankStandaloneNum) && rankStandaloneNum > 0 ? Math.floor(rankStandaloneNum) : null,
        total: Number.isFinite(totalNum) && totalNum > 0 ? Math.floor(totalNum) : totalFallback,
        score: Number.isFinite(scoreNum) ? scoreNum : null,
        scoreStandalone: Number.isFinite(scoreStandaloneNum) ? scoreStandaloneNum : null,
        confidence: Number.isFinite(confNum) ? confNum : null,
        corr63d: Number.isFinite(corr63Num) ? corr63Num : null,
        corr252d: Number.isFinite(corr252Num) ? corr252Num : null,
      } as DisplayRow;
    })
    .filter((x): x is DisplayRow => Boolean(x));
}

function scoreText(score?: number | null): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return String(Math.round(score));
}

type FactorRankingTableProps = {
  tableKey: string;
  rows: DisplayRow[];
  sort: TableSort;
  onSortChange: (sort: TableSort) => void;
  effectiveScoreMode: ScoreMode;
  hasStandaloneScores: boolean;
  selectedFactorId: string;
  compareCap: number;
  selectedCompareCount: number;
  isSelectedTheme: (slug?: string | null) => boolean;
  onToggleTheme: (row: DisplayRow) => void;
};

function SortHeader({
  label,
  column,
  sort,
  onSortChange,
  align = "left",
  title,
}: {
  label: string;
  column: SortColumn;
  sort: TableSort;
  onSortChange: (sort: TableSort) => void;
  align?: "left" | "right";
  title?: string;
}) {
  const active = sort.column === column;
  return (
    <th scope="col" className={align === "right" ? styles.thRight : undefined} title={title}>
      <button
        type="button"
        className={`${styles.sortBtn} ${active ? styles.sortBtnActive : ""}`}
        aria-label={sortAriaLabel(column, sort, label)}
        title={title}
        onClick={() => onSortChange(nextTableSort(column, sort))}
      >
        <span>{label}</span>
        <span className={styles.sortIndicator} aria-hidden="true">
          {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function FactorRankingTable({
  tableKey,
  rows,
  sort,
  onSortChange,
  effectiveScoreMode,
  hasStandaloneScores,
  selectedFactorId,
  compareCap,
  selectedCompareCount,
  isSelectedTheme,
  onToggleTheme,
}: FactorRankingTableProps) {
  const modeCopy = SCORE_MODE_COPY[effectiveScoreMode];
  const altMode: ScoreMode = effectiveScoreMode === "standalone" ? "incremental" : "standalone";
  const altLabel = altMode === "standalone" ? "Co-move" : "Inc.";
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Cmp</th>
          <SortHeader label="Rank" column="rank" sort={sort} onSortChange={onSortChange} />
          <SortHeader label="Theme" column="theme" sort={sort} onSortChange={onSortChange} />
          <SortHeader
            label="Score"
            column="score"
            sort={sort}
            onSortChange={onSortChange}
            align="right"
            title={modeCopy.scoreColumnTooltip}
          />
          {hasStandaloneScores ? (
            <SortHeader
              label={altLabel}
              column="altScore"
              sort={sort}
              onSortChange={onSortChange}
              align="right"
              title={SCORE_MODE_COPY[altMode].scoreColumnTooltip}
            />
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${tableKey}-${selectedFactorId}-${row.theme}`}>
            <td>
              <input
                type="checkbox"
                aria-label={`Compare ${row.theme}`}
                checked={isSelectedTheme(row.slug)}
                disabled={!row.slug || (!isSelectedTheme(row.slug) && selectedCompareCount >= compareCap)}
                onChange={() => onToggleTheme(row)}
              />
            </td>
            <td className={`${styles.scoreCell} ${styles.rankCell}`}>#{rowRank(row, effectiveScoreMode)}</td>
            <td>
              {row.slug ? (
                <Link href={`/themes/${row.slug}`} className={styles.themeLink}>
                  {row.theme}
                </Link>
              ) : (
                row.theme
              )}
            </td>
            <td className={styles.scoreCell}>{scoreText(rowScore(row, effectiveScoreMode))}</td>
            {hasStandaloneScores ? (
              <td className={styles.altScoreCell}>
                {effectiveScoreMode === "standalone" ? scoreText(row.score) : scoreText(row.scoreStandalone)}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FactorsPageClient({ dataBaseUrl, factorMethodology }: Props) {
  const [indexPayload, setIndexPayload] = useState<FactorIndexV0 | null>(null);
  const [timeseries, setTimeseries] = useState<FactorTimeseriesV0 | null>(null);
  const [selectedFactorId, setSelectedFactorId] = useState<string>("");
  const [rowsCache, setRowsCache] = useState<Record<string, DisplayRow[]>>({});
  const [themeSeriesCache, setThemeSeriesCache] = useState<Record<string, ThemeChartSeries | null>>({});
  const [selectedThemes, setSelectedThemes] = useState<Array<{ slug: string; theme: string }>>([]);
  const [isMobileCompare, setIsMobileCompare] = useState(false);
  const [visibleClosestCount, setVisibleClosestCount] = useState(50);
  const [visibleLeastCount, setVisibleLeastCount] = useState(50);
  const [scoreMode, setScoreMode] = useState<ScoreMode>("standalone");
  const [closestSort, setClosestSort] = useState<TableSort>({ column: "rank", direction: "asc" });
  const [leastSort, setLeastSort] = useState<TableSort>({ column: "rank", direction: "desc" });
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const themeSeriesCacheRef = useRef(themeSeriesCache);

  useEffect(() => {
    themeSeriesCacheRef.current = themeSeriesCache;
  }, [themeSeriesCache]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([loadFactorIndex(dataBaseUrl), loadFactorTimeseries(dataBaseUrl)])
        .then(([next, ts]) => {
          if (cancelled) return;
          if (!next || !Object.keys(next.factors || {}).length) {
            setStatus((prev) => (prev === "ok" ? prev : "empty"));
            return;
          }
          setIndexPayload(next);
          if (ts) setTimeseries(ts);
          setSelectedFactorId((prev) => {
            if (prev && next.factors?.[prev]) return prev;
            return factorOptions(next)[0]?.id || "";
          });
          setStatus("ok");
        })
        .catch(() => {
          if (!cancelled) setStatus((prev) => (prev === "ok" ? prev : "error"));
        });
    };

    load();
    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [dataBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedFactorId) return;
    loadFactorRows(dataBaseUrl, selectedFactorId)
      .then((res) => {
        if (cancelled || !res?.entries) return;
        const nextRows = normalizeRows(res.entries as unknown[]);
        setRowsCache((prev) => {
          if (prev[selectedFactorId]) return prev;
          return { ...prev, [selectedFactorId]: nextRows };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl, selectedFactorId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobileCompare(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const compareCap = isMobileCompare ? 3 : 8;

  useEffect(() => {
    // Keep the selection valid when the responsive comparison cap changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedThemes((prev) => prev.slice(0, compareCap));
  }, [compareCap]);

  useEffect(() => {
    let cancelled = false;
    const missing = selectedThemes.filter((t) => {
      const hit = themeSeriesCacheRef.current[t.slug];
      return hit === undefined || hit?._transformVersion !== THEME_COMPARE_TRANSFORM_VERSION;
    });
    if (!missing.length) return;
    Promise.all(
      missing.map(async (item) => {
        try {
          const base = dataBaseUrl.replace(/\/$/, "");
          const url = `${base}/themes/${encodeURIComponent(item.slug)}.json?${stockthemesBrowserCacheBusterQuery()}`;
          const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
          if (!res.ok) return [item.slug, null] as const;
          const payload = (await res.json()) as {
            name?: string;
            chart_1y?: { performance?: ChartPerformanceV0 };
          };
          const perf = payload?.chart_1y?.performance;
          const datesRaw = perf?.dates;
          const valuesRaw = perf?.values;
          const dates = Array.isArray(datesRaw) ? datesRaw.filter((v): v is string => typeof v === "string") : [];
          const valuesParsed = Array.isArray(valuesRaw)
            ? valuesRaw.map((v) => Number(v)).filter((v) => Number.isFinite(v))
            : [];
          if (!dates.length || !valuesParsed.length || dates.length !== valuesParsed.length) {
            return [item.slug, null] as const;
          }
          const themeName = item.theme.trim() || (typeof payload?.name === "string" ? payload.name.trim() : "");
          const values = applyShortThemePerformanceDisplay(themeName, valuesParsed, perf);
          return [
            item.slug,
            { ...item, dates, values, _transformVersion: THEME_COMPARE_TRANSFORM_VERSION },
          ] as const;
        } catch {
          return [item.slug, null] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setThemeSeriesCache((prev) => {
        const next = { ...prev };
        for (const [slug, series] of pairs) {
          next[slug] = series;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl, selectedThemes]);

  const options = useMemo(() => (indexPayload ? factorOptions(indexPayload) : []), [indexPayload]);
  const rows = useMemo(
    () => rowsCache[selectedFactorId] ?? [],
    [rowsCache, selectedFactorId],
  );
  const hasStandaloneScores = useMemo(
    () => rows.some((r) => r.scoreStandalone != null && Number.isFinite(r.scoreStandalone)),
    [rows],
  );
  const effectiveScoreMode: ScoreMode = hasStandaloneScores ? scoreMode : "incremental";

  useEffect(() => {
    // Reset table intent when switching factor or score interpretation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClosestSort({ column: "rank", direction: "asc" });
    setLeastSort({ column: "rank", direction: "desc" });
  }, [selectedFactorId, effectiveScoreMode]);

  const closestRows = useMemo(
    () => sortDisplayRows(rows, closestSort, effectiveScoreMode).slice(0, visibleClosestCount),
    [rows, closestSort, effectiveScoreMode, visibleClosestCount],
  );
  const leastRows = useMemo(
    () => sortDisplayRows(rows, leastSort, effectiveScoreMode).slice(0, visibleLeastCount),
    [rows, leastSort, effectiveScoreMode, visibleLeastCount],
  );
  const selectedMethod = selectedFactorId ? factorMethodology[selectedFactorId] : null;
  const series = selectedFactorId ? timeseries?.factors?.[selectedFactorId] : null;
  const selectedFactorLabel = selectedFactorId
    ? factorDisplayLabel(selectedFactorId, series?.label ?? indexPayload?.factors?.[selectedFactorId]?.label)
    : "";
  const totalRows = indexPayload?.factors?.[selectedFactorId]?.total ?? rows[0]?.total ?? 0;
  const selectedThemeSeries = useMemo(
    () =>
      selectedThemes
        .map((item, idx) => {
          const s = themeSeriesCache[item.slug];
          if (!s?.values?.length) return null;
          return { ...s, color: COMPARE_COLORS[idx % COMPARE_COLORS.length] };
        })
        .filter((x): x is ThemeChartSeries & { color: string } => Boolean(x)),
    [selectedThemes, themeSeriesCache],
  );
  const chartSeries = useMemo(() => {
    if (!series?.values?.length) return [] as FactorChartSeries[];
    const base: FactorChartSeries = {
      id: "factor",
      label: `${selectedFactorLabel} factor`,
      dates: series.dates,
      values: series.values,
      color: FACTOR_LINE_COLOR,
    };
    return [
      ...selectedThemeSeries.map((s) => ({
        id: `theme-${s.slug}`,
        label: s.theme,
        dates: s.dates,
        values: s.values,
        color: s.color,
      })),
      base,
    ];
  }, [selectedThemeSeries, series, selectedFactorLabel]);
  const toggleThemeSelection = (row: DisplayRow) => {
    const slug = row.slug;
    if (!slug) return;
    setSelectedThemes((prev) => {
      const exists = prev.some((x) => x.slug === slug);
      if (exists) return prev.filter((x) => x.slug !== slug);
      if (prev.length >= compareCap) return prev;
      return [...prev, { slug, theme: row.theme }];
    });
  };
  const isSelectedTheme = (slug?: string | null) => Boolean(slug && selectedThemes.some((x) => x.slug === slug));
  const seriesChange = useMemo(() => {
    if (!series?.values?.length || series.values.length < 2) return null;
    const first = series.values[0];
    const last = series.values[series.values.length - 1];
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
    return ((last / first - 1) * 100).toFixed(1);
  }, [series]);

  if (status === "loading") return <p className={styles.empty}>Loading factor rankings…</p>;
  if (status === "empty") return <p className={styles.empty}>No factor ranking data is available yet.</p>;
  if (status === "error" || !indexPayload) return <p className={styles.empty}>Could not load factor rankings.</p>;

  return (
    <div className={styles.factorsRoot}>
      <div className={styles.chartSection}>
        <div className={styles.chartSectionTop}>
          <div className={styles.factorSelectBlock}>
            <label htmlFor="factor-select" className={styles.label}>
              Factor
            </label>
            <div className={styles.factorSelectWrap}>
              <select
                id="factor-select"
                className={styles.factorSelect}
                value={selectedFactorId}
                onChange={(e) => {
                  setSelectedFactorId(e.target.value);
                  setVisibleClosestCount(50);
                  setVisibleLeastCount(50);
                }}
              >
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedMethod ? (
            <div className={styles.factorExplainerBlock}>
              <span id="factor-explainer-heading" className={styles.label}>
                Explanation
              </span>
              <aside className={styles.factorExplainerBox} aria-labelledby="factor-explainer-heading">
                <p className={styles.factorExplainerText}>{selectedMethod.summary}</p>
              </aside>
            </div>
          ) : null}
        </div>
        {series?.values?.length ? (
          <div className={styles.chartWrap}>
          <div className={styles.chartHead}>
            <p className={styles.chartTitle}>
              {selectedFactorLabel} factor trend (1Y)
              {seriesChange ? (
                <span className={styles.chartDelta}> · {Number(seriesChange) >= 0 ? "+" : ""}{seriesChange}%</span>
              ) : null}
            </p>
            <div className={styles.compareControls}>
              <span className={styles.compareHint}>
                Compare themes ({selectedThemes.length}/{compareCap})
              </span>
              {selectedThemes.length ? (
                <button type="button" className={styles.clearBtn} onClick={() => setSelectedThemes([])}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <FactorTrendChart series={chartSeries} ariaLabel={`${selectedFactorLabel} factor chart`} />
          <div className={styles.compareLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: FACTOR_LINE_COLOR }} />
              {selectedFactorLabel} factor
            </span>
            {selectedThemeSeries.map((item) => (
              <span key={`legend-${item.slug}`} className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: item.color }} />
                {item.theme}
              </span>
            ))}
          </div>
        </div>
        ) : null}
      </div>
      {hasStandaloneScores ? (
        <div className={styles.rankingToolbar}>
          <div className={styles.rankingToolbarMain}>
            <span className={styles.rankingToolbarLabel}>Rank by</span>
            <div className={styles.scoreModeSwitch} role="group" aria-label="Rank by score type">
              <button
                type="button"
                className={`${styles.scoreModeOption} ${effectiveScoreMode === "standalone" ? styles.scoreModeOptionActive : ""}`}
                aria-pressed={effectiveScoreMode === "standalone"}
                onClick={() => setScoreMode("standalone")}
              >
                Co-movement
              </button>
              <button
                type="button"
                className={`${styles.scoreModeOption} ${effectiveScoreMode === "incremental" ? styles.scoreModeOptionActive : ""}`}
                aria-pressed={effectiveScoreMode === "incremental"}
                onClick={() => setScoreMode("incremental")}
              >
                Incremental
              </button>
            </div>
            <span className={styles.rankingToolbarHint}>
              {SCORE_MODE_COPY[effectiveScoreMode].description}
            </span>
            <span className={styles.rankingToolbarMeta}>
              {totalRows ? `${totalRows.toLocaleString()} themes` : null}
              {indexPayload.as_of ? ` · ${indexPayload.as_of.slice(0, 10)}` : null}
            </span>
          </div>
        </div>
      ) : null}
      <div className={styles.rankingGrid}>
        <section className={styles.panel} aria-label="Closest themes">
          <h3 className={styles.panelTitle}>
            {SCORE_MODE_COPY[effectiveScoreMode].label} (Top{" "}
            {Math.min(visibleClosestCount, 250)})
          </h3>
          <div className={styles.tableWrap}>
            <FactorRankingTable
              tableKey="closest"
              rows={closestRows}
              sort={closestSort}
              onSortChange={setClosestSort}
              effectiveScoreMode={effectiveScoreMode}
              hasStandaloneScores={hasStandaloneScores}
              selectedFactorId={selectedFactorId}
              compareCap={compareCap}
              selectedCompareCount={selectedThemes.length}
              isSelectedTheme={isSelectedTheme}
              onToggleTheme={toggleThemeSelection}
            />
          </div>
          {visibleClosestCount < 250 ? (
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => setVisibleClosestCount((n) => Math.min(n + 50, 250))}
              >
                Show 50 more
              </button>
            </div>
          ) : null}
        </section>
        <section className={styles.panel} aria-label="Least close themes">
          <h3 className={styles.panelTitle}>
            Lowest {SCORE_MODE_COPY[effectiveScoreMode].label.toLowerCase()} (Bottom{" "}
            {Math.min(visibleLeastCount, 250)}
            {totalRows ? ` of ${totalRows.toLocaleString()}` : ""})
          </h3>
          <div className={styles.tableWrap}>
            <FactorRankingTable
              tableKey="least"
              rows={leastRows}
              sort={leastSort}
              onSortChange={setLeastSort}
              effectiveScoreMode={effectiveScoreMode}
              hasStandaloneScores={hasStandaloneScores}
              selectedFactorId={selectedFactorId}
              compareCap={compareCap}
              selectedCompareCount={selectedThemes.length}
              isSelectedTheme={isSelectedTheme}
              onToggleTheme={toggleThemeSelection}
            />
          </div>
          {visibleLeastCount < 250 ? (
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => setVisibleLeastCount((n) => Math.min(n + 50, 250))}
              >
                Show 50 more
              </button>
            </div>
          ) : null}
        </section>
      </div>
      <p className={styles.caption}>
        {totalRows ? totalRows.toLocaleString() : "—"} ranked themes
        {indexPayload.as_of ? ` · As of ${indexPayload.as_of.slice(0, 10)}` : ""}
      </p>
    </div>
  );
}
