"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";

import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";
import type { CompositionMeta } from "@/lib/constituentMeta";
import { sortCompositionSeriesByMarketCapDesc } from "@/lib/constituentMeta";
import {
  chartCustomPeriodsFromManifest,
  chart1yWithExtendedComposition,
  chart1yWithExtendedPerformance,
  chartPerformancesForDetailPeriodSupport,
  chartPeriodWindowLabel,
  compositionSeriesSidecarKind,
  compositionTickersNeedingExtendedHistory,
  compositionTickersNeedingLiveTail,
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  mergeExtendedChartPerformance,
  normalizeCompositionSidecarSlug,
  performanceNeedsExtendedHistory,
  referenceLastIsoFromPerformances,
  sliceBenchmarkForPeriod,
  sliceThemeChart1yForPeriod,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/chartPeriodControls";
import { fetchChartSidecar, type OverlayEntityKind } from "@/lib/chartSidecar";
import { fetchSpyBenchmarkPerformance } from "@/lib/fetchSpyBenchmark";
import { OVERLAY_STANDARD_PERIODS, rebaseIndexedValuesTo100 } from "@/lib/sliceIndexedChart";
import { applyShortThemePerformanceDisplay } from "@/lib/shortThemeChart";
import { isSuspiciousChartPerformanceCliff, sanitizeChartPerformanceForDisplay } from "@/lib/chartPerformanceSanity";
import { publicAssetPath } from "@/lib/siteUrl";
import { TickerBadge } from "@/components/TickerBadge";
import { ChartPeriodToolbar } from "@/components/ChartPeriodToolbar";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import styles from "./Chart1yPanel.module.css";

function isStandardPeriod(p: OverlayChartPeriod): p is OverlayStandardPeriod {
  return (OVERLAY_STANDARD_PERIODS as readonly string[]).includes(p);
}

/** Stable key so composition view ignores live performance tail-only updates. */
function chartDataCanvasKey(
  chart1y: ThemeChart1yV0 | undefined,
  benchmark: ChartPerformanceV0 | undefined,
  activeView: "performance" | "composition",
  period: OverlayChartPeriod,
): string {
  if (!chart1y) return "";
  const bl = benchmark?.dates?.length ?? 0;
  const bTail = bl
    ? `${benchmark!.dates![0]}\0${benchmark!.dates![bl - 1]}\0${bl}`
    : "";
  if (activeView === "performance") {
    const p = chart1y.performance;
    const pl = p?.dates?.length ?? 0;
    const pTail = pl ? `${p!.dates![0]}\0${p!.dates![pl - 1]}\0${pl}` : "";
    return `perf\x1f${period}\x1f${pTail}\x1f${bTail}`;
  }
  const comp = chart1y.composition_indexed;
  const rows =
    comp?.series
      ?.filter((s) => s.dates?.length && s.values?.length)
      .map((s) => {
        const L = s.dates!.length;
        return `${s.ticker}:${s.dates![0]}:${s.dates![L - 1]}:${L}:${s.values![0]}:${s.values![L - 1]}`;
      })
      .join("\x1e") ?? "";
  return `comp\x1f${period}\x1f${rows}\x1f${bTail}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/**
 * `hoveredSeries` is often undefined when crosshair lines are hidden or the hit target
 * isn't the series; `seriesData` still has values at the crosshair time — use that.
 */
function pickLineSeriesForTooltip(
  param: MouseEventParams,
  seriesIdByApi: Map<ISeriesApi<"Line">, string>,
): ISeriesApi<"Line"> | undefined {
  if (!param.seriesData?.size) return undefined;

  const fromHover = param.hoveredSeries as ISeriesApi<"Line"> | undefined;
  if (fromHover && seriesIdByApi.has(fromHover) && fromHover.options().visible) {
    return fromHover;
  }

  if (seriesIdByApi.size === 1) {
    const line = seriesIdByApi.keys().next().value as ISeriesApi<"Line"> | undefined;
    if (!line?.options().visible) return undefined;
    const data = param.seriesData.get(line);
    return lineDataValue(data) != null ? line : undefined;
  }

  const pt = param.point;
  let best: ISeriesApi<"Line"> | undefined;
  let bestDist = Infinity;

  for (const [sApi, data] of param.seriesData) {
    const line = sApi as ISeriesApi<"Line">;
    if (!seriesIdByApi.has(line)) continue;
    if (!line.options().visible) continue;
    const val = lineDataValue(data);
    if (val == null) continue;
    if (!pt) {
      best = line;
      break;
    }
    const y = line.priceToCoordinate(val);
    if (y == null) continue;
    const d = Math.abs(y - pt.y);
    if (d < bestDist) {
      bestDist = d;
      best = line;
    }
  }
  if (best === undefined) {
    for (const [sApi, data] of param.seriesData) {
      const line = sApi as ISeriesApi<"Line">;
      if (!seriesIdByApi.has(line)) continue;
      if (!line.options().visible) continue;
      if (lineDataValue(data) != null) return line;
    }
  }
  return best;
}

const PALETTE = [
  "#26fcd6",
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

/** Stable id for the single performance line (not a ticker). */
const PERF_SERIES_ID = "__performance__";
const INTEGER_PRICE_FORMAT = { type: "price" as const, precision: 0, minMove: 1 };

/** Lightweight Charts: business-day ISO strings, sorted ascending. */
function toDay(d: string): string {
  if (d.length >= 10 && d[4] === "-" && d[7] === "-") {
    return d.slice(0, 10);
  }
  // Support epoch timestamps sent as numeric strings.
  if (/^\d+$/.test(d)) {
    const raw = Number(d);
    if (Number.isFinite(raw) && raw > 0) {
      const millis = raw > 1e12 ? raw : raw * 1000;
      const iso = new Date(millis).toISOString().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    }
  }
  const t = Date.parse(d);
  if (Number.isNaN(t)) return d;
  return new Date(t).toISOString().slice(0, 10);
}

function toPoints(dates: string[], values: (number | string)[]) {
  const n = Math.min(dates.length, values.length);
  const out: { time: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) continue;
    const time = toDay(String(dates[i]));
    // lightweight-charts Time string must be ISO date like YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(time)) continue;
    out.push({ time, value: v });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

function slicePointsToRange(
  points: { time: string; value: number }[],
  startIso?: string,
  endIso?: string,
): { time: string; value: number }[] {
  if (!points.length) return points;
  const start = startIso?.trim().slice(0, 10) || "";
  const end = endIso?.trim().slice(0, 10) || "";
  if (!start && !end) return points;
  return points.filter((p) => (!start || p.time >= start) && (!end || p.time <= end));
}

function rebasePointsTo100(
  points: { time: string; value: number }[],
): { time: string; value: number }[] | null {
  if (points.length < 2) return null;
  const rebased = rebaseIndexedValuesTo100(points.map((p) => p.value));
  if (!rebased) return null;
  return points.map((p, i) => ({ time: p.time, value: rebased[i] }));
}

type Chart1yCanvasProps = {
  chart1y: ThemeChart1yV0 | undefined;
  benchmarkPerformance?: ChartPerformanceV0;
  activeView: "performance" | "composition";
  /** Composition legend hidden tickers — applied after each canvas rebuild. */
  hiddenSeries?: string[];
  lineApisRef: MutableRefObject<Map<string, ISeriesApi<"Line">>>;
  /** Ref so tooltip meta stays fresh without remounting the chart when `memo` skips canvas render. */
  compositionMetaRef: MutableRefObject<Record<string, CompositionMeta> | undefined>;
  performanceTitleRef: MutableRefObject<string | undefined>;
};

/**
 * Isolated from the parent so React re-renders (legend toggle, etc.) do not reconcile away
 * the imperative canvas DOM that lightweight-charts injects into an otherwise "empty" div.
 */
const Chart1yCanvas = memo(function Chart1yCanvas({
  chart1y,
  benchmarkPerformance,
  activeView,
  hiddenSeries = [],
  lineApisRef,
  compositionMetaRef,
  performanceTitleRef,
}: Chart1yCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );

  useEffect(() => {
    setRenderError(null);
    const el = wrapRef.current;
    if (!el) return;
    if (activeView === "performance" && !hasPerf) return;
    if (activeView === "composition" && !hasComp) return;

    lineApisRef.current.clear();

    const width = Math.max(el.clientWidth, 200);
    const height = activeView === "composition" ? 460 : 420;

    let chart: IChartApi | null = null;
    try {
      chart = createChart(el, {
        autoSize: false,
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "#0f1115" },
          textColor: "#a6abb9",
          fontSize: 12,
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          // Hide pane logo; lightweight-charts license still requires a site-visible TradingView link (see SiteFooter).
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          // Hide the default crosshair "perforated" lines + labels.
          vertLine: {
            color: "rgba(255,255,255,0.06)",
            width: 1,
            style: LineStyle.LargeDashed,
            visible: false,
            labelVisible: false,
            labelBackgroundColor: "#0f1115",
          },
          horzLine: {
            color: "rgba(255,255,255,0.06)",
            width: 1,
            style: LineStyle.LargeDashed,
            visible: false,
            labelVisible: false,
            labelBackgroundColor: "#0f1115",
          },
        },
        handleScale: {
          mouseWheel: false,
          pinch: false,
          axisPressedMouseMove: false,
        },
        // No horizontal pan: keep the fitted ~1Y range fixed in the viewport.
        handleScroll: false,
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.08)",
          scaleMargins: { top: 0.1, bottom: 0.15 },
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.08)",
          timeVisible: true,
          secondsVisible: false,
        },
      });
      chartRef.current = chart;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setRenderError(`Lightweight Charts init failed: ${msg}`);
      return;
    }

    const perfPointsRaw =
      activeView === "performance" ? toPoints(perf?.dates ?? [], perf?.values ?? []) : null;
    const perfPoints =
      perfPointsRaw && perfPointsRaw.length >= 2
        ? rebasePointsTo100(perfPointsRaw) ?? perfPointsRaw
        : perfPointsRaw;
    const benchmarkPointsRaw = toPoints(
      benchmarkPerformance?.dates ?? [],
      benchmarkPerformance?.values ?? [],
    );
    const compRange = (() => {
      if (activeView !== "composition" || !comp?.series?.length) return null;
      let start = "";
      let end = "";
      for (const s of comp.series) {
        if (!s.dates?.length || !s.values?.length) continue;
        const pts = toPoints(s.dates, s.values);
        if (!pts.length) continue;
        const sStart = pts[0]?.time || "";
        const sEnd = pts[pts.length - 1]?.time || "";
        if (!start || (sStart && sStart < start)) start = sStart;
        if (!end || (sEnd && sEnd > end)) end = sEnd;
      }
      return start && end ? { start, end } : null;
    })();
    const benchmarkAligned = (() => {
      if (activeView === "composition") {
        return slicePointsToRange(
          benchmarkPointsRaw,
          compRange?.start,
          compRange?.end,
        );
      }
      // Performance: benchmark is period-sliced upstream — do not clip to theme span
      // (theme may still be on ~1Y embedded data while 2Y/5Y sidecar loads).
      return benchmarkPointsRaw;
    })();
    const benchmarkRebased =
      benchmarkAligned && benchmarkAligned.length >= 2
        ? rebasePointsTo100(benchmarkAligned) ?? benchmarkAligned
        : benchmarkAligned;
    const benchmarkPoints =
      benchmarkRebased && benchmarkRebased.length >= 20 ? benchmarkRebased : null;
    const perfHasPoints = Boolean(perfPoints && perfPoints.length);

    const seriesIdByApi = new Map<ISeriesApi<"Line">, string>();
    /** Single series in performance mode — skip nearest-line scan on every crosshair frame. */
    let perfLineApi: ISeriesApi<"Line"> | undefined;
    try {
      if (activeView === "performance" && perfPoints) {
        const series = chart.addLineSeries({
          color: "#26fcd6",
          lineWidth: 2,
          // Empty title: LW still draws colored end labels on the pane when title is set,
          // even if lastValueVisible is false. Tooltip uses PERF_SERIES_ID map instead.
          title: "",
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: true,
          priceFormat: INTEGER_PRICE_FORMAT,
        });
        series.setData(perfPoints);
        perfLineApi = series;
        lineApisRef.current.set(PERF_SERIES_ID, series);
        seriesIdByApi.set(series, PERF_SERIES_ID);
        if (benchmarkPoints && benchmarkPoints.length) {
          const bench = chart.addLineSeries({
            color: "rgba(173, 182, 199, 0.85)",
            lineWidth: 2,
            lineStyle: LineStyle.Dotted,
            title: "",
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceFormat: INTEGER_PRICE_FORMAT,
          });
          bench.setData(benchmarkPoints);
        }
      } else if (activeView === "composition" && comp?.series) {
        if (benchmarkPoints && benchmarkPoints.length) {
          const bench = chart.addLineSeries({
            color: "rgba(173, 182, 199, 0.85)",
            lineWidth: 2,
            lineStyle: LineStyle.Dotted,
            title: "",
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceFormat: INTEGER_PRICE_FORMAT,
          });
          bench.setData(benchmarkPoints);
        }
        const hidden = new Set(hiddenSeries);
        comp.series.forEach((s, i) => {
          if (!s.dates?.length || !s.values?.length) return;
          const pts = toPoints(s.dates, s.values);
          if (!pts.length) return;
          const series = chart.addLineSeries({
            color: PALETTE[i % PALETTE.length],
            lineWidth: 2,
            title: "",
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            visible: !hidden.has(s.ticker),
            priceFormat: INTEGER_PRICE_FORMAT,
          });
          series.setData(pts);
          lineApisRef.current.set(s.ticker, series);
          seriesIdByApi.set(series, s.ticker);
        });
      }

      if (activeView === "performance" && !perfHasPoints) {
        setRenderError("No valid performance points to plot (dates/values parsing).");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setRenderError(`Lightweight Charts render failed: ${msg}`);
    }

    chart.timeScale().fitContent();

    const tickerToSeriesName = new Map<string, string | undefined>();
    comp?.series?.forEach((s) => tickerToSeriesName.set(s.ticker, s.name));

    /** Only toggle the previous/next series — avoid O(n) applyOptions on every crosshair frame. */
    let seriesWithCrosshairMarker: ISeriesApi<"Line"> | undefined;
    const syncCompositionCrosshairMarkers = (picked: ISeriesApi<"Line"> | undefined) => {
      if (activeView !== "composition") return;
      if (seriesWithCrosshairMarker === picked) return;
      if (seriesWithCrosshairMarker) {
        seriesWithCrosshairMarker.applyOptions({ crosshairMarkerVisible: false });
      }
      seriesWithCrosshairMarker = picked;
      if (picked) {
        picked.applyOptions({ crosshairMarkerVisible: true });
      }
    };

    let crosshairRaf = 0;
    let pendingCrosshair: MouseEventParams | null = null;
    let lastPerfTooltipText = "";
    let lastCompositionTipKey = "";

    const flushCrosshair = () => {
      crosshairRaf = 0;
      const param = pendingCrosshair;
      pendingCrosshair = null;
      const tooltip = tooltipRef.current;
      if (!tooltip || !chartRef.current) return;

      if (!param?.point) {
        tooltip.style.display = "none";
        lastPerfTooltipText = "";
        lastCompositionTipKey = "";
        syncCompositionCrosshairMarkers(undefined);
        return;
      }
      const hovered =
        activeView === "performance"
          ? perfLineApi
          : pickLineSeriesForTooltip(param, seriesIdByApi);
      if (!hovered) {
        tooltip.style.display = "none";
        lastPerfTooltipText = "";
        lastCompositionTipKey = "";
        syncCompositionCrosshairMarkers(undefined);
        return;
      }
      const id = seriesIdByApi.get(hovered);
      if (!id) {
        tooltip.style.display = "none";
        lastPerfTooltipText = "";
        lastCompositionTipKey = "";
        syncCompositionCrosshairMarkers(undefined);
        return;
      }

      syncCompositionCrosshairMarkers(hovered);

      const price = lineDataValue(param.seriesData.get(hovered));
      const priceStr =
        price != null ? price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : null;
      const dateLabel = formatTooltipDate(param.time);

      if (id === PERF_SERIES_ID) {
        const perfLabel =
          performanceTitleRef.current?.trim() ||
          perf?.aggregation?.trim() ||
          "Performance";
        const nextText = priceStr != null
          ? `${dateLabel ? `${dateLabel} · ` : ""}${perfLabel} — ${priceStr}`
          : `${dateLabel ? `${dateLabel} · ` : ""}${perfLabel}`;
        if (nextText !== lastPerfTooltipText) {
          lastPerfTooltipText = nextText;
          tooltip.innerHTML = "";
          tooltip.textContent = nextText;
        }
      } else {
        const upper = id.toUpperCase();
        const name =
          compositionMetaRef.current?.[upper]?.name?.trim() ||
          tickerToSeriesName.get(id)?.trim() ||
          "";
        const displayTitle = name || id;
        const valueLine = priceStr != null ? escapeHtml(priceStr) : "—";
        const dateLine = dateLabel ? escapeHtml(dateLabel) : "";
        const tipKey = `${dateLine}\x00${displayTitle}\x00${valueLine}`;
        if (tipKey !== lastCompositionTipKey) {
          lastCompositionTipKey = tipKey;
          tooltip.innerHTML = [
            dateLine ? `<div style="color:#a6abb9">${dateLine}</div>` : "",
            `<div><strong style="color:#e8eaed;font-weight:600">${escapeHtml(displayTitle)}</strong></div>`,
            `<div>${valueLine}</div>`,
          ].join("");
        }
      }

      tooltip.style.display = "block";
      const lx = Math.round(param.point.x + 10);
      const ly = Math.round(param.point.y + 10);
      tooltip.style.left = `${lx}px`;
      tooltip.style.top = `${ly}px`;
    };

    const handleCrosshairMove = (param: MouseEventParams) => {
      pendingCrosshair = param;
      if (crosshairRaf !== 0) return;
      crosshairRaf = requestAnimationFrame(flushCrosshair);
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    let resizeFitTimer: ReturnType<typeof setTimeout> | null = null;
    let lastObservedWidth = width;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!wrapRef.current || !chartRef.current) return;
            const w = Math.max(wrapRef.current.clientWidth, 200);
            if (w === lastObservedWidth) return;
            lastObservedWidth = w;
            if (resizeFitTimer !== null) clearTimeout(resizeFitTimer);
            resizeFitTimer = setTimeout(() => {
              resizeFitTimer = null;
              if (!wrapRef.current || !chartRef.current) return;
              const w2 = Math.max(wrapRef.current.clientWidth, 200);
              lastObservedWidth = w2;
              chartRef.current.applyOptions({ width: w2 });
              chartRef.current.timeScale().fitContent();
            }, 120);
          })
        : null;
    ro?.observe(el);

    return () => {
      if (crosshairRaf !== 0) {
        cancelAnimationFrame(crosshairRaf);
      }
      if (resizeFitTimer !== null) {
        clearTimeout(resizeFitTimer);
      }
      ro?.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      // Lightweight charts can throw in dev/HMR if teardown runs after node detaches.
      try {
        chart?.remove();
      } catch {
        // no-op
      }
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- perf/comp/benchmark are sliced upstream; hiddenSeries applied in follow-up effect
  }, [chart1y, benchmarkPerformance, activeView, lineApisRef]);

  /** Legend toggle without full chart rebuild (composition only). */
  useEffect(() => {
    if (activeView !== "composition") return;
    const hidden = new Set(hiddenSeries);
    for (const [id, api] of lineApisRef.current.entries()) {
      api.applyOptions({ visible: !hidden.has(id) });
    }
  }, [activeView, hiddenSeries, lineApisRef]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={wrapRef} className={styles.chartBox} style={{ minHeight: 420 }} />
      <div className={styles.chartBrandMark} aria-hidden="true">
        <img
          src={publicAssetPath("/brand/logo-full-dark-tight.png")}
          alt=""
          loading="lazy"
          fetchPriority="low"
          decoding="async"
        />
      </div>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          zIndex: 100,
          display: "none",
          padding: "6px 10px",
          borderRadius: 8,
          background: "rgba(15, 17, 21, 0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "#a6abb9",
          fontSize: 12,
          pointerEvents: "none",
          whiteSpace: "normal",
          maxWidth: 360,
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      />
      {renderError ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            background: "rgba(15, 17, 21, 0.8)",
            color: "#a6abb9",
            fontSize: 13,
            lineHeight: 1.4,
            textAlign: "center",
            borderRadius: 8,
          }}
        >
          {renderError}
        </div>
      ) : null}
    </div>
  );
});

export type Chart1yLightweightProps = {
  chart1y: ThemeChart1yV0 | undefined;
  benchmarkPerformance?: ChartPerformanceV0;
  compositionMetaByTicker?: Record<string, CompositionMeta>;
  /** Performance-line tooltip label; overrides JSON `performance.aggregation` (e.g. "average"). */
  performanceTitle?: string;
  /** See `Chart1yPanelProps.compositionLegendShowSeriesBadge`. */
  compositionLegendShowSeriesBadge?: boolean;
  /**
   * When false, composition legend omits the market-cap column (e.g. home highlighted chart).
   * Group ticker-preview column is unchanged when present.
   */
  compositionLegendShowMcap?: boolean;
  /**
   * Manifest custom event dates (IranWar, LibDay, …). When set, shows period controls
   * and defaults the chart to 1Y instead of the full embedded history window.
   */
  selectedDates?: ManifestSelectedDateV0[];
  /** When set, 2Y/5Y/custom periods lazy-load slim ``.chart.v0.json`` (no full detail JSON fetch). */
  sidecarEntity?: { kind: OverlayEntityKind; slug: string };
};

function formatMarketCap(v: number | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return "MCap n/a";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

/**
 * ~1Y performance / composition lines via lightweight-charts (bundled; static-export friendly).
 * Composition view: clickable legend toggles `series.applyOptions({ visible })`. Performance is a single line — no legend.
 */
export function Chart1yLightweight({
  chart1y,
  benchmarkPerformance,
  compositionMetaByTicker,
  performanceTitle,
  compositionLegendShowSeriesBadge = true,
  compositionLegendShowMcap = true,
  selectedDates,
  sidecarEntity,
}: Chart1yLightweightProps) {
  const showPeriodControls = selectedDates !== undefined;
  const customPeriods = useMemo(
    () => (showPeriodControls ? chartCustomPeriodsFromManifest(selectedDates) : []),
    [showPeriodControls, selectedDates],
  );
  const customAnchorByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customPeriods) m.set(c.key, c.date);
    return m;
  }, [customPeriods]);

  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [extendedPerformance, setExtendedPerformance] = useState<ChartPerformanceV0 | undefined>(
    undefined,
  );
  const [extendedCompositionByTicker, setExtendedCompositionByTicker] = useState<
    Record<string, ChartPerformanceV0>
  >({});
  const [extendedBenchmark, setExtendedBenchmark] = useState<ChartPerformanceV0 | undefined>(
    undefined,
  );
  const extendedPerformanceRef = useRef<ChartPerformanceV0 | undefined>(undefined);
  const extendedBenchmarkRef = useRef<ChartPerformanceV0 | undefined>(undefined);
  const performanceSidecarFetchedRef = useRef("");
  const benchmarkFetchedRef = useRef("");
  extendedPerformanceRef.current = extendedPerformance;
  extendedBenchmarkRef.current = extendedBenchmark;
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );

  const [view, setView] = useState<"performance" | "composition">(
    () => (hasPerf ? "performance" : "composition"),
  );

  const chart1ySorted = useMemo(() => {
    if (!chart1y) return chart1y;
    const c = chart1y.composition_indexed;
    if (!c?.series?.length) return chart1y;
    const series = sortCompositionSeriesByMarketCapDesc(c.series, compositionMetaByTicker);
    return { ...chart1y, composition_indexed: { ...c, series } };
  }, [chart1y, compositionMetaByTicker]);

  /** Short themes: same display inversion as /factors compare (CDN vs dev disk cache can differ). */
  const chart1yForRender = useMemo(() => {
    const base = chart1ySorted;
    if (!base) return base;

    let next = base;
    const comp = base.composition_indexed;
    if (comp?.series?.length) {
      let compChanged = false;
      const series = comp.series.map((s) => {
        if (!s.dates?.length || !s.values?.length) return s;
        const sanitized =
          sanitizeChartPerformanceForDisplay({ dates: s.dates, values: s.values }) ??
          ({ dates: s.dates, values: s.values } satisfies ChartPerformanceV0);
        if (sanitized.dates === s.dates && sanitized.values === s.values) return s;
        compChanged = true;
        return { ...s, dates: sanitized.dates, values: sanitized.values };
      });
      if (compChanged) {
        next = { ...next, composition_indexed: { ...comp, series } };
      }
    }

    const p = next.performance;
    if (!p?.values?.length) return next === base ? base : next;
    const sanitized = sanitizeChartPerformanceForDisplay(p) ?? p;
    const title = performanceTitle?.trim() ?? "";
    const values = applyShortThemePerformanceDisplay(title, sanitized.values, sanitized);
    const perf =
      values === sanitized.values ? sanitized : { ...sanitized, values };
    if (perf === p && next === base) return base;
    return { ...next, performance: perf };
  }, [chart1ySorted, performanceTitle]);

  useEffect(() => {
    setExtendedPerformance(undefined);
    setExtendedCompositionByTicker({});
    setExtendedBenchmark(undefined);
    extendedPerformanceRef.current = undefined;
    extendedBenchmarkRef.current = undefined;
    performanceSidecarFetchedRef.current = "";
    benchmarkFetchedRef.current = "";
  }, [sidecarEntity?.kind, sidecarEntity?.slug, period]);

  const referenceLastIso = useMemo(
    () =>
      referenceLastIsoFromPerformances([
        chart1yForRender?.performance,
        benchmarkPerformance,
      ]),
    [chart1yForRender?.performance, benchmarkPerformance],
  );

  const activeView: "performance" | "composition" =
    view === "composition" && hasComp
      ? "composition"
      : hasPerf
        ? "performance"
        : hasComp
          ? "composition"
          : "performance";

  const customAnchorIso = isStandardPeriod(period)
    ? undefined
    : customAnchorByKey.get(period);

  const needsExtendedHistory = useMemo(
    () =>
      Boolean(
        showPeriodControls &&
          sidecarEntity &&
          performanceNeedsExtendedHistory(
            chart1yForRender?.performance,
            period,
            referenceLastIso,
            customAnchorIso,
          ),
      ),
    [
      showPeriodControls,
      sidecarEntity,
      chart1yForRender?.performance,
      period,
      referenceLastIso,
      customAnchorIso,
    ],
  );

  useEffect(() => {
    if (!needsExtendedHistory || !sidecarEntity) return;
    const fetchToken = `${sidecarEntity.kind}:${sidecarEntity.slug}:${period}:${customAnchorIso ?? ""}`;
    const merged = mergeExtendedChartPerformance(
      chart1yForRender?.performance,
      extendedPerformanceRef.current,
    );
    if (
      merged &&
      extendedPerformanceRef.current &&
      !performanceNeedsExtendedHistory(merged, period, referenceLastIso, customAnchorIso)
    ) {
      performanceSidecarFetchedRef.current = fetchToken;
      return;
    }
    if (performanceSidecarFetchedRef.current === fetchToken) return;

    let cancelled = false;
    void fetchChartSidecar(sidecarEntity.kind, sidecarEntity.slug)
      .then((sidecar) => {
        if (cancelled || !sidecar?.performance?.dates?.length) return;
        let perf = sanitizeChartPerformanceForDisplay(sidecar.performance) ?? sidecar.performance;
        const title = performanceTitle?.trim() ?? "";
        const values = applyShortThemePerformanceDisplay(title, perf.values, perf);
        if (values !== perf.values) perf = { ...perf, values };
        if (isSuspiciousChartPerformanceCliff(perf, chart1yForRender?.performance)) return;
        performanceSidecarFetchedRef.current = fetchToken;
        setExtendedPerformance(perf);
      })
      .catch(() => {
        /* keep embedded window on CDN miss */
      });
    return () => {
      cancelled = true;
    };
  }, [
    needsExtendedHistory,
    sidecarEntity,
    period,
    customAnchorIso,
    referenceLastIso,
    performanceTitle,
    chart1yForRender?.performance,
  ]);

  const needsExtendedBenchmark = useMemo(
    () =>
      Boolean(
        showPeriodControls &&
          performanceNeedsExtendedHistory(
            benchmarkPerformance,
            period,
            referenceLastIso,
            customAnchorIso,
          ),
      ),
    [showPeriodControls, benchmarkPerformance, period, referenceLastIso, customAnchorIso],
  );

  useEffect(() => {
    if (!needsExtendedBenchmark) return;
    const fetchToken = `${period}:${customAnchorIso ?? ""}`;
    const merged = mergeExtendedChartPerformance(
      benchmarkPerformance,
      extendedBenchmarkRef.current,
    );
    if (
      merged &&
      extendedBenchmarkRef.current &&
      !performanceNeedsExtendedHistory(merged, period, referenceLastIso, customAnchorIso)
    ) {
      benchmarkFetchedRef.current = fetchToken;
      return;
    }
    if (benchmarkFetchedRef.current === fetchToken) return;

    let cancelled = false;
    void fetchSpyBenchmarkPerformance()
      .then((perf) => {
        if (cancelled || !perf?.dates?.length) return;
        const sanitized = sanitizeChartPerformanceForDisplay(perf) ?? perf;
        if (isSuspiciousChartPerformanceCliff(sanitized, benchmarkPerformance)) return;
        benchmarkFetchedRef.current = fetchToken;
        setExtendedBenchmark(sanitized);
      })
      .catch(() => {
        /* keep embedded benchmark on CDN miss */
      });
    return () => {
      cancelled = true;
    };
  }, [
    needsExtendedBenchmark,
    period,
    customAnchorIso,
    referenceLastIso,
    benchmarkPerformance,
  ]);

  const compositionSidecarKind = sidecarEntity
    ? compositionSeriesSidecarKind(sidecarEntity.kind)
    : null;

  const compositionTickersNeedingFetch = useMemo(() => {
    if (activeView !== "composition" || !compositionSidecarKind) {
      return [];
    }
    const forHistory =
      showPeriodControls
        ? compositionTickersNeedingExtendedHistory(
            chart1yForRender,
            period,
            referenceLastIso,
            customAnchorIso,
            extendedCompositionByTicker,
          )
        : [];
    const forLiveTail = compositionTickersNeedingLiveTail(
      chart1yForRender,
      referenceLastIso,
      extendedCompositionByTicker,
    );
    return Array.from(new Set([...forHistory, ...forLiveTail]));
  }, [
    showPeriodControls,
    activeView,
    compositionSidecarKind,
    chart1yForRender,
    period,
    referenceLastIso,
    customAnchorIso,
    extendedCompositionByTicker,
  ]);

  const compositionTickersFetchKey = compositionTickersNeedingFetch.slice().sort().join("\0");
  const compositionLiveTailFetch = useMemo(() => {
    if (!referenceLastIso || !chart1yForRender?.composition_indexed?.series?.length) return false;
    return compositionTickersNeedingLiveTail(chart1yForRender, referenceLastIso).length > 0;
  }, [chart1yForRender, referenceLastIso]);
  const compSeriesRef = useRef(chart1yForRender?.composition_indexed?.series);
  compSeriesRef.current = chart1yForRender?.composition_indexed?.series;

  useEffect(() => {
    if (!compositionSidecarKind || !compositionTickersFetchKey) return;

    const tickersToFetch = compositionTickersFetchKey.split("\0").filter(Boolean);
    let cancelled = false;
    void Promise.all(
      tickersToFetch.map(async (tickerKey) => {
        const slug = normalizeCompositionSidecarSlug(compositionSidecarKind, tickerKey);
        const sidecar = await fetchChartSidecar(compositionSidecarKind, slug, undefined, {
          live: compositionLiveTailFetch,
        });
        if (!sidecar?.performance?.dates?.length) return null;
        const series = compSeriesRef.current?.find(
          (s) => s.ticker.trim().toUpperCase() === tickerKey,
        );
        const baseline = series
          ? ({ dates: series.dates, values: series.values } satisfies ChartPerformanceV0)
          : undefined;
        let perf = sanitizeChartPerformanceForDisplay(sidecar.performance) ?? sidecar.performance;
        if (isSuspiciousChartPerformanceCliff(perf, baseline)) return null;
        return { tickerKey, perf };
      }),
    )
      .then((rows) => {
        if (cancelled) return;
        const updates: Record<string, ChartPerformanceV0> = {};
        for (const row of rows) {
          if (!row) continue;
          updates[row.tickerKey] = row.perf;
        }
        if (Object.keys(updates).length === 0) return;
        setExtendedCompositionByTicker((prev) => ({ ...prev, ...updates }));
      })
      .catch(() => {
        /* keep embedded composition window on CDN miss */
      });

    return () => {
      cancelled = true;
    };
  }, [compositionSidecarKind, compositionTickersFetchKey, compositionLiveTailFetch]);

  const chart1yWithHistory = useMemo(() => {
    const withPerf = chart1yWithExtendedPerformance(chart1yForRender, extendedPerformance);
    return chart1yWithExtendedComposition(withPerf, extendedCompositionByTicker);
  }, [chart1yForRender, extendedPerformance, extendedCompositionByTicker]);

  const performancesForSupport = useMemo(
    () => chartPerformancesForDetailPeriodSupport(chart1yWithHistory, activeView),
    [chart1yWithHistory, activeView],
  );

  const supportedPeriods = useMemo(
    () => computeOverlaySupportedPeriods(referenceLastIso, performancesForSupport),
    [referenceLastIso, performancesForSupport],
  );

  const supportedCustomPeriodKeys = useMemo(
    () =>
      showPeriodControls
        ? computeOverlaySupportedCustomPeriodKeys(
            performancesForSupport,
            customPeriods.map((c) => ({ key: c.key, date: c.date })),
          )
        : new Set<string>(),
    [showPeriodControls, performancesForSupport, customPeriods],
  );

  useEffect(() => {
    if (!showPeriodControls) return;
    if (isStandardPeriod(period) && !supportedPeriods.has(period)) {
      setPeriod("1Y");
    } else if (
      !isStandardPeriod(period) &&
      customPeriods.some((c) => c.key === period) &&
      !supportedCustomPeriodKeys.has(period)
    ) {
      setPeriod("1Y");
    }
  }, [showPeriodControls, period, supportedPeriods, supportedCustomPeriodKeys, customPeriods]);

  const chart1yForCanvas = useMemo(() => {
    if (!showPeriodControls || !chart1yWithHistory) return chart1yWithHistory;
    return sliceThemeChart1yForPeriod(
      chart1yWithHistory,
      period,
      customAnchorIso,
      referenceLastIso,
    );
  }, [showPeriodControls, chart1yWithHistory, period, customAnchorIso, referenceLastIso]);

  const benchmarkForCanvas = useMemo(() => {
    const merged = mergeExtendedChartPerformance(benchmarkPerformance, extendedBenchmark);
    if (!showPeriodControls) return merged;
    return sliceBenchmarkForPeriod(
      merged,
      period,
      customAnchorIso,
      referenceLastIso,
    );
  }, [
    showPeriodControls,
    benchmarkPerformance,
    extendedBenchmark,
    period,
    customAnchorIso,
    referenceLastIso,
  ]);

  const canvasInputKey = useMemo(
    () => chartDataCanvasKey(chart1yForCanvas, benchmarkForCanvas, activeView, period),
    [chart1yForCanvas, benchmarkForCanvas, activeView, period],
  );
  const canvasChart1y = useMemo(() => chart1yForCanvas, [canvasInputKey]);
  const canvasBenchmark = useMemo(() => benchmarkForCanvas, [canvasInputKey]);

  const periodWindowLabel = showPeriodControls
    ? chartPeriodWindowLabel(period, customPeriods)
    : "the Past Year";

  const lineApisRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const compositionMetaRef = useRef(compositionMetaByTicker);
  const performanceTitleRef = useRef(performanceTitle);
  /** Tickers hidden via legend click (state drives visibility; synced after canvas rebuild). */
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const hiddenSet = useMemo(() => new Set(hiddenSeries), [hiddenSeries]);

  useEffect(() => {
    setHiddenSeries([]);
  }, [period, activeView, sidecarEntity?.kind, sidecarEntity?.slug]);

  useEffect(() => {
    compositionMetaRef.current = compositionMetaByTicker;
  }, [compositionMetaByTicker]);

  useEffect(() => {
    performanceTitleRef.current = performanceTitle;
  }, [performanceTitle]);

  const toggleSeries = useCallback((id: string) => {
    setHiddenSeries((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  if (!hasPerf && !hasComp) {
    return null;
  }
  const themeLabel = performanceTitle?.trim() || "Theme";
  return (
    <section className={styles.section} aria-label="Theme performance chart">
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>
          {activeView === "composition" ? (
            <>
              <span className={styles.themeTitleAccent}>{themeLabel}</span> Constituents Over{" "}
              {periodWindowLabel}
            </>
          ) : (
            <>
              <span className={styles.themeTitleAccent}>{themeLabel} Index</span>
              <span className={styles.benchmarkTitle}>
                {" "}
                vs. S&P 500 Index Over {periodWindowLabel}
              </span>
            </>
          )}
        </span>
        {hasPerf && hasComp ? (
          <div className={styles.toggle} role="group" aria-label="Chart type">
            <button
              type="button"
              className={activeView === "performance" ? styles.active : undefined}
              onClick={() => setView("performance")}
            >
              Performance
            </button>
            <button
              type="button"
              className={activeView === "composition" ? styles.active : undefined}
              onClick={() => setView("composition")}
            >
              Composition (line)
            </button>
          </div>
        ) : null}
      </div>
      <Chart1yCanvas
        chart1y={canvasChart1y}
        benchmarkPerformance={canvasBenchmark}
        activeView={activeView}
        hiddenSeries={hiddenSeries}
        lineApisRef={lineApisRef}
        compositionMetaRef={compositionMetaRef}
        performanceTitleRef={performanceTitleRef}
      />
      {showPeriodControls ? (
        <div className={styles.periodBar}>
          <ChartPeriodToolbar
            period={period}
            onPeriodChange={setPeriod}
            supportedPeriods={supportedPeriods}
            supportedCustomPeriodKeys={supportedCustomPeriodKeys}
            customPeriods={customPeriods}
            variant="detail"
          />
        </div>
      ) : null}
      {activeView === "composition" && hasComp && chart1ySorted?.composition_indexed?.series ? (
        <div
          className={styles.legend}
          role="group"
          aria-label="Series — click a name to show or hide on the chart"
        >
          {chart1ySorted.composition_indexed.series.map((s, i) => {
            if (!s.dates?.length || !s.values?.length) return null;
            const meta = compositionMetaByTicker?.[s.ticker.toUpperCase()];
            const name = meta?.name?.trim() || s.name?.trim() || "";
            const ticker = s.ticker?.trim() || "";
            const tickersPreview = meta?.tickersPreview?.trim();
            const showThirdColumn = Boolean(tickersPreview) || compositionLegendShowMcap;
            const stackedLegend = Boolean(tickersPreview);
            return (
              <button
                key={s.ticker}
                type="button"
                className={`${styles.legendItemButton} ${!showThirdColumn ? styles.legendItemButtonTwoCol : ""} ${stackedLegend ? styles.legendItemButtonStacked : ""} ${hiddenSet.has(s.ticker) ? styles.legendItemMuted : ""}`}
                aria-pressed={!hiddenSet.has(s.ticker)}
                onClick={() => toggleSeries(s.ticker)}
              >
                <span
                  className={styles.swatch}
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className={styles.legendNameCell}>
                  {name ? <span className={styles.legendLabel}>{name}</span> : null}
                  {compositionLegendShowSeriesBadge && ticker ? (
                    <TickerBadge ticker={ticker} />
                  ) : null}
                </span>
                {showThirdColumn ? (
                  <span
                    className={
                      tickersPreview ? styles.legendTickers : styles.legendMcap
                    }
                  >
                    {tickersPreview
                      ? tickersPreview
                      : formatMarketCap(meta?.marketCapUsd)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
