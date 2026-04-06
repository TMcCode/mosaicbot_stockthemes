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

import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { CompositionMeta } from "@/lib/constituentMeta";
import { sortCompositionSeriesByMarketCapDesc } from "@/lib/constituentMeta";
import { TickerBadge } from "@/components/TickerBadge";

import styles from "./Chart1yPanel.module.css";

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

type Chart1yCanvasProps = {
  chart1y: ThemeChart1yV0 | undefined;
  activeView: "performance" | "composition";
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
  activeView,
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

    const perfPoints =
      activeView === "performance" ? toPoints(perf?.dates ?? [], perf?.values ?? []) : null;
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
        });
        series.setData(perfPoints);
        perfLineApi = series;
        lineApisRef.current.set(PERF_SERIES_ID, series);
        seriesIdByApi.set(series, PERF_SERIES_ID);
      } else if (activeView === "composition" && comp?.series) {
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
        price != null ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : null;

      if (id === PERF_SERIES_ID) {
        const perfLabel =
          performanceTitleRef.current?.trim() ||
          perf?.aggregation?.trim() ||
          "Performance";
        const nextText = priceStr != null ? `${perfLabel} — ${priceStr}` : perfLabel;
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
        const tipKey = `${displayTitle}\x00${valueLine}`;
        if (tipKey !== lastCompositionTipKey) {
          lastCompositionTipKey = tipKey;
          tooltip.innerHTML = [
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
      chart?.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- perf/comp come from chart1y
  }, [chart1y, activeView, lineApisRef]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={wrapRef} className={styles.chartBox} style={{ minHeight: 420 }} />
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
  compositionMetaByTicker?: Record<string, CompositionMeta>;
  /** Performance-line tooltip label; overrides JSON `performance.aggregation` (e.g. "average"). */
  performanceTitle?: string;
  /** See `Chart1yPanelProps.compositionLegendShowSeriesBadge`. */
  compositionLegendShowSeriesBadge?: boolean;
};

function formatMarketCap(v: number | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return "—";
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
  compositionMetaByTicker,
  performanceTitle,
  compositionLegendShowSeriesBadge = true,
}: Chart1yLightweightProps) {
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );

  const chart1ySorted = useMemo(() => {
    if (!chart1y) return chart1y;
    const c = chart1y.composition_indexed;
    if (!c?.series?.length) return chart1y;
    const series = sortCompositionSeriesByMarketCapDesc(c.series, compositionMetaByTicker);
    return { ...chart1y, composition_indexed: { ...c, series } };
  }, [chart1y, compositionMetaByTicker]);

  const [view, setView] = useState<"performance" | "composition">(
    () => (hasPerf ? "performance" : "composition"),
  );

  const activeView: "performance" | "composition" =
    view === "composition" && hasComp
      ? "composition"
      : hasPerf
        ? "performance"
        : hasComp
          ? "composition"
          : "performance";

  const lineApisRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const compositionMetaRef = useRef(compositionMetaByTicker);
  compositionMetaRef.current = compositionMetaByTicker;
  const performanceTitleRef = useRef(performanceTitle);
  performanceTitleRef.current = performanceTitle;
  /** Tickers / PERF_SERIES_ID hidden via legend click (state so we don't read refs during render). */
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const hiddenSet = useMemo(() => new Set(hiddenSeries), [hiddenSeries]);

  useEffect(() => {
    // Reset legend toggles when the chart data or mode changes (new series APIs in Chart1yCanvas).
    setHiddenSeries([]);
  }, [chart1ySorted, activeView]);

  const toggleSeries = useCallback((id: string) => {
    const api = lineApisRef.current.get(id);
    if (!api) return;
    setHiddenSeries((prev) => {
      const wasHidden = prev.includes(id);
      api.applyOptions({ visible: wasHidden });
      if (wasHidden) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  if (!hasPerf && !hasComp) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="About one year chart">
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Chart (~1Y)</span>
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
        chart1y={chart1ySorted}
        activeView={activeView}
        lineApisRef={lineApisRef}
        compositionMetaRef={compositionMetaRef}
        performanceTitleRef={performanceTitleRef}
      />
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
            return (
              <button
                key={s.ticker}
                type="button"
                className={`${styles.legendItemButton} ${hiddenSet.has(s.ticker) ? styles.legendItemMuted : ""}`}
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
                <span
                  className={
                    meta?.tickersPreview?.trim() ? styles.legendTickers : styles.legendMcap
                  }
                >
                  {meta?.tickersPreview?.trim()
                    ? meta.tickersPreview.trim()
                    : formatMarketCap(meta?.marketCapUsd)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
