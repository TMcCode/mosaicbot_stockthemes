"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";

import { OVERLAY_BENCHMARK_COLOR } from "@/lib/overlayChartPalette";
import { publicAssetPath } from "@/lib/siteUrl";
import type { ChartPerformanceV0 } from "@/types/chart.v0";

import styles from "./OverlayMultiChart.module.css";

const BENCHMARK_ID = "__benchmark__";
const BENCHMARK_NAME = "S&P 500";
const INTEGER_PRICE_FORMAT = { type: "price" as const, precision: 0, minMove: 1 };

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

function formatIndexedValue(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export type OverlayChartSeries = {
  id: string;
  name: string;
  kind: "theme" | "group" | "etf" | "ticker";
  color: string;
  performance: ChartPerformanceV0;
  /** Group composition–style legend: comma-separated tickers (+N). */
  tickersPreview?: string;
  /** Group rows: sector or theme count on the legend right. */
  legendMeta?: string;
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

type Props = {
  series: OverlayChartSeries[];
  benchmark?: ChartPerformanceV0;
  hiddenIds: Set<string>;
  showBenchmark: boolean;
};

export function OverlayMultiChart({ series, benchmark, hiddenIds, showBenchmark }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const seriesApisRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenIds.has(s.id) && s.performance?.dates?.length),
    [series, hiddenIds],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    seriesApisRef.current.clear();
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    if (!visibleSeries.length && !(showBenchmark && benchmark?.dates?.length)) {
      return;
    }

    const width = Math.max(el.clientWidth, 320);
    const chart = createChart(el, {
      autoSize: false,
      width,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: "#0f1115" },
        textColor: "#a6abb9",
        fontSize: 12,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
      handleScroll: false,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    type LineMeta = { id: string; name: string; color: string };
    const orderedLines: { api: ISeriesApi<"Line">; meta: LineMeta }[] = [];

    visibleSeries.forEach((s) => {
      const pts = toPoints(s.performance.dates, s.performance.values.map(Number));
      if (pts.length < 2) return;
      const line = chart.addLineSeries({
        color: s.color,
        lineWidth: 2,
        title: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        priceFormat: INTEGER_PRICE_FORMAT,
      });
      line.setData(pts);
      seriesApisRef.current.set(s.id, line);
      orderedLines.push({ api: line, meta: { id: s.id, name: s.name, color: s.color } });
    });

    if (showBenchmark && benchmark?.dates?.length && benchmark?.values?.length) {
      const benchPts = toPoints(benchmark.dates, benchmark.values.map(Number));
      if (benchPts.length >= 2) {
        const bench = chart.addLineSeries({
          color: OVERLAY_BENCHMARK_COLOR,
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          title: "",
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: true,
          priceFormat: INTEGER_PRICE_FORMAT,
        });
        bench.setData(benchPts);
        orderedLines.push({
          api: bench,
          meta: { id: BENCHMARK_ID, name: BENCHMARK_NAME, color: OVERLAY_BENCHMARK_COLOR },
        });
      }
    }

    chart.timeScale().fitContent();

    let crosshairRaf = 0;
    let pendingCrosshair: MouseEventParams | null = null;
    let lastTooltipKey = "";

    const flushCrosshair = () => {
      crosshairRaf = 0;
      const param = pendingCrosshair;
      pendingCrosshair = null;
      const tooltip = tooltipRef.current;
      const shell = shellRef.current;
      if (!tooltip || !shell || !chartRef.current) return;

      if (!param?.point || !param.seriesData?.size) {
        tooltip.style.display = "none";
        lastTooltipKey = "";
        return;
      }

      const dateLabel = formatTooltipDate(param.time);
      const rows: string[] = [];

      for (const { api, meta } of orderedLines) {
        if (!api.options().visible) continue;
        const v = lineDataValue(param.seriesData.get(api));
        if (v == null) continue;
        rows.push(
          `<div class="${styles.tooltipRow}">` +
            `<span class="${styles.tooltipSwatch}" style="background:${escapeHtml(meta.color)}"></span>` +
            `<span class="${styles.tooltipName}">${escapeHtml(meta.name)}</span>` +
            `<span class="${styles.tooltipValue}">${escapeHtml(formatIndexedValue(v))}</span>` +
            `</div>`,
        );
      }

      if (!rows.length) {
        tooltip.style.display = "none";
        lastTooltipKey = "";
        return;
      }

      const tipKey = `${dateLabel}\x00${rows.join("\x00")}`;
      if (tipKey !== lastTooltipKey) {
        lastTooltipKey = tipKey;
        tooltip.innerHTML =
          (dateLabel ? `<div class="${styles.tooltipDate}">${escapeHtml(dateLabel)}</div>` : "") +
          `<div class="${styles.tooltipRows}">${rows.join("")}</div>`;
      }

      tooltip.style.display = "block";

      const shellW = shell.clientWidth;
      const shellH = shell.clientHeight;
      const tipW = tooltip.offsetWidth;
      const tipH = tooltip.offsetHeight;
      let lx = Math.round(param.point.x + 12);
      let ly = Math.round(param.point.y + 12);
      if (lx + tipW > shellW - 8) lx = Math.round(param.point.x - tipW - 12);
      if (ly + tipH > shellH - 8) ly = Math.round(param.point.y - tipH - 12);
      lx = Math.max(8, Math.min(lx, shellW - tipW - 8));
      ly = Math.max(8, Math.min(ly, shellH - tipH - 8));
      tooltip.style.left = `${lx}px`;
      tooltip.style.top = `${ly}px`;
    };

    const handleCrosshairMove = (param: MouseEventParams) => {
      pendingCrosshair = param;
      if (crosshairRaf !== 0) return;
      crosshairRaf = requestAnimationFrame(flushCrosshair);
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: Math.max(wrapRef.current.clientWidth, 320) });
    });
    ro.observe(el);

    return () => {
      if (crosshairRaf !== 0) {
        cancelAnimationFrame(crosshairRaf);
      }
      ro.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      seriesApisRef.current.clear();
    };
  }, [visibleSeries, benchmark, showBenchmark]);

  if (!series.length && !(showBenchmark && benchmark?.dates?.length)) {
    return (
      <div className={styles.empty} aria-live="polite">
        Add up to 12 themes, groups, tickers, or sector SPDRs to compare indexed performance.
      </div>
    );
  }

  return (
    <div className={styles.chartShell} ref={shellRef}>
      <div className={styles.chartBox} ref={wrapRef} aria-label="Theme compare chart" />
      <div ref={tooltipRef} className={styles.chartTooltip} />
      <div className={styles.chartBrandMark} aria-hidden="true">
        <img
          src={publicAssetPath("/brand/logo-full-dark-tight.png")}
          alt=""
          loading="lazy"
          fetchPriority="low"
          decoding="async"
        />
      </div>
    </div>
  );
}
