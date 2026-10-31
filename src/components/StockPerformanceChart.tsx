"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";

import { ChartPeriodToolbar } from "@/components/ChartPeriodToolbar";
import { useStockthemesTheme } from "@/components/ThemeRoot";
import { fetchChartSidecar } from "@/lib/chartSidecar";
import {
  applyChartTheme,
  applyIndexedBaselineTheme,
  attachIndexedBaseline,
  chartThemeOptions,
} from "@/lib/chartTheme";
import {
  chartCustomPeriodsFromManifest,
  chartPeriodWindowLabel,
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  referenceLastIsoFromPerformances,
  sliceBenchmarkForPeriod,
  type OverlayChartPeriod,
} from "@/lib/chartPeriodControls";
import { fetchSpyBenchmarkPerformance } from "@/lib/fetchSpyBenchmark";
import { parseStockAppPayload, stockAppBrowserPath } from "@/lib/mergeStockApp";
import {
  OVERLAY_BENCHMARK_COLOR,
  OVERLAY_CHART_PALETTE,
} from "@/lib/overlayChartPalette";
import { sliceAndRebaseIndexedPerformance } from "@/lib/sliceIndexedChart";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { chartViewHeight } from "@/lib/chartViewHeight";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import styles from "./StockPerformanceChart.module.css";

const BENCHMARK_ID = "__benchmark__";
const BENCHMARK_NAME = "S&P 500";
const THEME_INDEX_ID = "__theme_index__";
const THEME_INDEX_NAME = "Weighted themes";
const THEME_INDEX_COLOR = "#c4b5fd";
const THEME_INDEX_LEGEND_TIP =
  "Weight-normalized blend of this ticker’s membership themes (current ThemeWgt held constant). Same series as the Weighted themes row in the table below.";
const SPY_LEGEND_TIP = "S&P 500 total-return index, rebased to 100 at the start of the selected period.";
const TICKER_LINE_COLOR = OVERLAY_CHART_PALETTE[0];
const INTEGER_PRICE_FORMAT = { type: "price" as const, precision: 0, minMove: 1 };
/** Theme overlays only — ticker + SPY always shown. */
const MAX_THEME_OVERLAYS = 10;
const THEME_CHECKBOX_INITIAL = 12;
const THEME_CHECKBOX_BATCH = 12;

export type StockChartThemeOption = {
  slug: string;
  name: string;
};

type Props = {
  ticker: string;
  displayName?: string;
  themes: StockChartThemeOption[];
  selectedDates?: ManifestSelectedDateV0[];
  /** SSR SPY series when available; client still refreshes via spy_snapshot. */
  initialBenchmark?: ChartPerformanceV0;
};

type ChartLine = {
  id: string;
  name: string;
  color: string;
  performance: ChartPerformanceV0;
  dotted?: boolean;
};

function toDay(d: string): string {
  const s = String(d || "").trim();
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const t = Date.parse(s);
  if (Number.isNaN(t)) return s;
  return new Date(t).toISOString().slice(0, 10);
}

function toPoints(dates: string[], values: number[]) {
  const n = Math.min(dates.length, values.length);
  const out: { time: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) continue;
    const time = toDay(dates[i]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(time)) continue;
    out.push({ time, value: v });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

function lineDataValue(data: unknown): number | null {
  if (data && typeof data === "object" && "value" in data) {
    const v = Number((data as { value: unknown }).value);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

function formatTooltipDate(time: MouseEventParams["time"] | undefined): string {
  if (!time) return "";
  if (typeof time === "string") return time;
  if (typeof time === "number") {
    const d = new Date(time * 1000);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    const y = Number((time as { year: number }).year);
    const m = Number((time as { month: number }).month);
    const d = Number((time as { day: number }).day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function StockPerformanceChart({
  ticker,
  displayName,
  themes,
  selectedDates = [],
  initialBenchmark,
}: Props) {
  const { theme } = useStockthemesTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [tickerPerf, setTickerPerf] = useState<ChartPerformanceV0 | null>(null);
  const [spyPerf, setSpyPerf] = useState<ChartPerformanceV0 | null>(
    () => initialBenchmark ?? null,
  );
  const [themePerfBySlug, setThemePerfBySlug] = useState<Record<string, ChartPerformanceV0>>(
    {},
  );
  const [checkedSlugs, setCheckedSlugs] = useState<Set<string>>(() => new Set());
  const [loadingThemes, setLoadingThemes] = useState<Set<string>>(() => new Set());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [themeVisible, setThemeVisible] = useState(() =>
    Math.min(themes.length, THEME_CHECKBOX_INITIAL),
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const indexedBaselineRef = useRef<IPriceLine | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const seriesApisRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const customPeriods = useMemo(
    () => chartCustomPeriodsFromManifest(selectedDates),
    [selectedDates],
  );

  const customAnchorIso = useMemo(() => {
    const hit = customPeriods.find((c) => c.key === period);
    return hit?.date;
  }, [customPeriods, period]);

  useEffect(() => {
    setThemeVisible(Math.min(themes.length, THEME_CHECKBOX_INITIAL));
  }, [themes]);

  const [themeIndexPerf, setThemeIndexPerf] = useState<ChartPerformanceV0 | null>(null);

  useEffect(() => {
    let stale = false;
    setLoadState("loading");
    setThemeIndexPerf(null);
    const appUrl = `${stockAppBrowserPath(ticker)}?${stockthemesBrowserCacheBusterQuery()}`;
    Promise.all([
      fetchChartSidecar("ticker", ticker),
      fetchSpyBenchmarkPerformance(),
      fetch(appUrl, { credentials: "omit", cache: stockthemesBrowserFetchCache() })
        .then(async (res) => {
          if (!res.ok) return null;
          return parseStockAppPayload(await res.json());
        })
        .catch(() => null),
    ])
      .then(([tickerSidecar, spy, app]) => {
        if (stale) return;
        setTickerPerf(tickerSidecar?.performance ?? null);
        setSpyPerf(spy ?? initialBenchmark ?? null);
        const idxChart = app?.theme_index?.chart;
        setThemeIndexPerf(
          idxChart?.dates?.length && idxChart?.values?.length ? idxChart : null,
        );
        setLoadState(tickerSidecar?.performance ? "ready" : "error");
      })
      .catch(() => {
        if (stale) return;
        setLoadState("error");
      });
    return () => {
      stale = true;
    };
  }, [ticker, initialBenchmark]);

  const themeColors = useMemo(() => {
    const map = new Map<string, string>();
    themes.forEach((t, i) => {
      map.set(t.slug, OVERLAY_CHART_PALETTE[(i + 1) % OVERLAY_CHART_PALETTE.length]);
    });
    return map;
  }, [themes]);

  const toggleTheme = useCallback(
    async (slug: string, checked: boolean) => {
      if (checked && checkedSlugs.size >= MAX_THEME_OVERLAYS && !checkedSlugs.has(slug)) {
        return;
      }
      setCheckedSlugs((prev) => {
        const next = new Set(prev);
        if (checked) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (!checked || themePerfBySlug[slug]) return;

      setLoadingThemes((prev) => new Set(prev).add(slug));
      try {
        const sidecar = await fetchChartSidecar("theme", slug);
        if (sidecar?.performance) {
          setThemePerfBySlug((prev) => ({ ...prev, [slug]: sidecar.performance }));
        }
      } finally {
        setLoadingThemes((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    },
    [themePerfBySlug, checkedSlugs],
  );

  const rawPerformances = useMemo(() => {
    const out: ChartPerformanceV0[] = [];
    if (tickerPerf) out.push(tickerPerf);
    if (themeIndexPerf) out.push(themeIndexPerf);
    for (const slug of checkedSlugs) {
      const perf = themePerfBySlug[slug];
      if (perf) out.push(perf);
    }
    return out;
  }, [tickerPerf, themeIndexPerf, checkedSlugs, themePerfBySlug]);

  /**
   * Period chips: gate on ticker + checked theme overlays only.
   * Weighted theme-index is usually ~1Y and must not grey out 2Y/5Y/LibDay
   * the way SPY is excluded on theme detail charts.
   */
  const periodSupportPerformances = useMemo(() => {
    const out: ChartPerformanceV0[] = [];
    if (tickerPerf) out.push(tickerPerf);
    for (const slug of checkedSlugs) {
      const perf = themePerfBySlug[slug];
      if (perf) out.push(perf);
    }
    return out;
  }, [tickerPerf, checkedSlugs, themePerfBySlug]);

  const referenceLastIso = useMemo(
    () => referenceLastIsoFromPerformances(rawPerformances),
    [rawPerformances],
  );

  const supportedPeriods = useMemo(
    () => computeOverlaySupportedPeriods(referenceLastIso, periodSupportPerformances),
    [referenceLastIso, periodSupportPerformances],
  );

  const supportedCustomPeriodKeys = useMemo(
    () => computeOverlaySupportedCustomPeriodKeys(periodSupportPerformances, customPeriods),
    [periodSupportPerformances, customPeriods],
  );

  useEffect(() => {
    if (!supportedPeriods.has(period as never) && !supportedCustomPeriodKeys.has(String(period))) {
      setPeriod("1Y");
    }
  }, [period, supportedPeriods, supportedCustomPeriodKeys]);

  const chartLines = useMemo((): ChartLine[] => {
    if (!tickerPerf) return [];
    const slicedTicker =
      sliceAndRebaseIndexedPerformance(tickerPerf, period, customAnchorIso, referenceLastIso) ??
      tickerPerf;
    const lines: ChartLine[] = [
      {
        id: ticker,
        name: ticker,
        color: TICKER_LINE_COLOR,
        performance: slicedTicker,
      },
    ];
    if (spyPerf) {
      const slicedSpy =
        sliceBenchmarkForPeriod(spyPerf, period, customAnchorIso, referenceLastIso) ?? spyPerf;
      lines.push({
        id: BENCHMARK_ID,
        name: BENCHMARK_NAME,
        color: OVERLAY_BENCHMARK_COLOR,
        performance: slicedSpy,
        dotted: true,
      });
    }
    if (themeIndexPerf) {
      const slicedIdx =
        sliceAndRebaseIndexedPerformance(
          themeIndexPerf,
          period,
          customAnchorIso,
          referenceLastIso,
        ) ?? themeIndexPerf;
      lines.push({
        id: THEME_INDEX_ID,
        name: THEME_INDEX_NAME,
        color: THEME_INDEX_COLOR,
        performance: slicedIdx,
        dotted: true,
      });
    }
    for (const slug of checkedSlugs) {
      const raw = themePerfBySlug[slug];
      const themeMeta = themes.find((t) => t.slug === slug);
      if (!raw || !themeMeta) continue;
      const sliced =
        sliceAndRebaseIndexedPerformance(raw, period, customAnchorIso, referenceLastIso) ?? raw;
      lines.push({
        id: slug,
        name: themeMeta.name,
        color: themeColors.get(slug) ?? OVERLAY_CHART_PALETTE[1],
        performance: sliced,
      });
    }
    return lines;
  }, [
    tickerPerf,
    spyPerf,
    themeIndexPerf,
    checkedSlugs,
    themePerfBySlug,
    themes,
    themeColors,
    period,
    customAnchorIso,
    referenceLastIso,
    ticker,
  ]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || loadState !== "ready" || chartLines.length === 0) return;

    seriesApisRef.current.clear();
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const width = Math.max(el.clientWidth, 320);
    const height = chartViewHeight();
    const themeOpts = chartThemeOptions(themeRef.current);
    const chart = createChart(el, {
      autoSize: false,
      width,
      height,
      ...themeOpts,
      layout: {
        ...themeOpts.layout,
        fontSize: 12,
        attributionLogo: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
      handleScroll: false,
      rightPriceScale: {
        ...themeOpts.rightPriceScale,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        ...themeOpts.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    type LineMeta = { id: string; name: string; color: string };
    const orderedLines: { api: ISeriesApi<"Line">; meta: LineMeta }[] = [];
    let baselineHost: ISeriesApi<"Line"> | undefined;
    indexedBaselineRef.current = null;

    chartLines.forEach((line) => {
      const pts = toPoints(line.performance.dates, line.performance.values.map(Number));
      if (pts.length < 2) return;
      const api = chart.addLineSeries({
        color: line.color,
        lineWidth: 2,
        lineStyle: line.dotted ? LineStyle.Dotted : LineStyle.Solid,
        title: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        priceFormat: INTEGER_PRICE_FORMAT,
      });
      api.setData(pts);
      seriesApisRef.current.set(line.id, api);
      orderedLines.push({ api, meta: { id: line.id, name: line.name, color: line.color } });
      if (!baselineHost) baselineHost = api;
    });

    if (baselineHost) {
      indexedBaselineRef.current = attachIndexedBaseline(baselineHost, themeRef.current);
    }

    const tooltip = tooltipRef.current;
    const onCrosshair = (param: MouseEventParams) => {
      if (!tooltip) return;
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        tooltip.style.display = "none";
        return;
      }
      const date = formatTooltipDate(param.time);
      const rows: string[] = [];
      for (const { api, meta } of orderedLines) {
        if (meta.id === THEME_INDEX_ID) continue;
        const data = param.seriesData.get(api);
        const val = lineDataValue(data);
        if (val == null) continue;
        rows.push(
          `<span style="color:${meta.color}">${escapeHtml(meta.name)}</span>: ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        );
      }
      if (!rows.length) {
        tooltip.style.display = "none";
        return;
      }
      tooltip.innerHTML = `<div>${escapeHtml(date)}</div>${rows.join("<br/>")}`;
      tooltip.style.display = "block";
      const box = el.getBoundingClientRect();
      const left = Math.min(Math.max(param.point.x + 12, 8), box.width - 160);
      const top = Math.min(Math.max(param.point.y - 24, 8), 300);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    chart.subscribeCrosshairMove(onCrosshair);
    chart.timeScale().fitContent();

    let resizeFitTimer: ReturnType<typeof setTimeout> | null = null;
    let lastObservedWidth = width;
    let lastObservedHeight = height;
    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return;
      const w = Math.max(wrapRef.current.clientWidth, 320);
      const h = chartViewHeight();
      if (w === lastObservedWidth && h === lastObservedHeight) return;
      lastObservedWidth = w;
      lastObservedHeight = h;
      if (resizeFitTimer !== null) clearTimeout(resizeFitTimer);
      resizeFitTimer = setTimeout(() => {
        resizeFitTimer = null;
        if (!wrapRef.current || !chartRef.current) return;
        const w2 = Math.max(wrapRef.current.clientWidth, 320);
        const h2 = chartViewHeight();
        lastObservedWidth = w2;
        lastObservedHeight = h2;
        chartRef.current.applyOptions({ width: w2, height: h2 });
        chartRef.current.timeScale().fitContent();
      }, 120);
    });
    ro.observe(el);

    return () => {
      if (resizeFitTimer !== null) clearTimeout(resizeFitTimer);
      ro.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshair);
      chart.remove();
      chartRef.current = null;
      seriesApisRef.current.clear();
      indexedBaselineRef.current = null;
    };
  }, [chartLines, loadState]);

  useEffect(() => {
    const chart = chartRef.current;
    const baseline = indexedBaselineRef.current;
    if (!chart) return;
    applyChartTheme(chart, theme);
    if (baseline) applyIndexedBaselineTheme(baseline, theme);
  }, [theme]);

  const periodLabel = chartPeriodWindowLabel(period, customPeriods);
  const overlayAtCap = checkedSlugs.size >= MAX_THEME_OVERLAYS;
  const visibleThemes = themes.slice(0, themeVisible);
  const moreThemes = themes.length - visibleThemes.length;

  return (
    <section className={styles.section} aria-label={`${ticker} performance chart`}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleAccent}>{displayName || ticker}</span>
          <span className={styles.titleMuted}> vs. S&amp;P 500 Index Over {periodLabel}</span>
        </h2>
        {loadState === "ready" && (spyPerf || themeIndexPerf) ? (
          <div className={styles.titleLegend} aria-label="Chart reference lines">
            {spyPerf ? (
              <span className={styles.titleLegendItem} title={SPY_LEGEND_TIP}>
                <span
                  className={styles.titleLegendSwatch}
                  style={{ borderColor: OVERLAY_BENCHMARK_COLOR }}
                  aria-hidden
                />
                S&amp;P 500 returns
              </span>
            ) : null}
            {themeIndexPerf ? (
              <span className={styles.titleLegendItem} title={THEME_INDEX_LEGEND_TIP}>
                <span
                  className={styles.titleLegendSwatch}
                  style={{ borderColor: THEME_INDEX_COLOR }}
                  aria-hidden
                />
                Weighted theme returns
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.chartBox}>
        {loadState === "loading" ? (
          <div className={styles.loading} aria-busy="true">
            Loading chart…
          </div>
        ) : loadState === "error" || !tickerPerf ? (
          <div className={styles.empty}>Performance chart unavailable for this ticker.</div>
        ) : (
          <div className={styles.chartStage}>
            <div ref={wrapRef} className={styles.chartCanvas} />
            <div ref={tooltipRef} className={styles.chartTooltip} aria-hidden />
          </div>
        )}
      </div>

      {loadState === "ready" && tickerPerf ? (
        <div className={styles.periodBar}>
          <ChartPeriodToolbar
            period={period}
            onPeriodChange={setPeriod}
            supportedPeriods={supportedPeriods}
            supportedCustomPeriodKeys={supportedCustomPeriodKeys}
            customPeriods={customPeriods}
            variant="detail"
            hideUnsupported
          />
        </div>
      ) : null}

      {themes.length > 0 ? (
        <>
          <div className={styles.themeOverlayRow} role="group" aria-label="Theme overlays">
            {visibleThemes.map((t) => {
              const checked = checkedSlugs.has(t.slug);
              const loading = loadingThemes.has(t.slug);
              const disabled = loading || (!checked && overlayAtCap);
              const color = themeColors.get(t.slug) ?? OVERLAY_CHART_PALETTE[1];
              return (
                <label
                  key={t.slug}
                  className={`${styles.themeOverlayLabel}${loading ? ` ${styles.themeOverlayLabelLoading}` : ""}${disabled && !checked ? ` ${styles.themeOverlayLabelDisabled}` : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => void toggleTheme(t.slug, e.target.checked)}
                  />
                  <span className={styles.themeSwatch} style={{ backgroundColor: color }} aria-hidden />
                  <span>{t.name}</span>
                </label>
              );
            })}
          </div>
          {moreThemes > 0 ? (
            <div className={styles.showMoreWrap}>
              <button
                type="button"
                className={styles.showMore}
                onClick={() =>
                  setThemeVisible((n) => Math.min(themes.length, n + THEME_CHECKBOX_BATCH))
                }
              >
                Show more themes ({Math.min(THEME_CHECKBOX_BATCH, moreThemes)})
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
