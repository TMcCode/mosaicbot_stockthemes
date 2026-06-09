"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";

import { OVERLAY_BENCHMARK_COLOR } from "@/lib/overlayChartPalette";
import { publicAssetPath } from "@/lib/siteUrl";
import type { ChartPerformanceV0 } from "@/types/chart.v0";

import styles from "./OverlayMultiChart.module.css";

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
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
          crosshairMarkerVisible: false,
        });
        bench.setData(benchPts);
      }
    }

    visibleSeries.forEach((s) => {
      const pts = toPoints(s.performance.dates, s.performance.values.map(Number));
      if (pts.length < 2) return;
      const line = chart.addLineSeries({
        color: s.color,
        lineWidth: 2,
        title: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(pts);
      seriesApisRef.current.set(s.id, line);
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: Math.max(wrapRef.current.clientWidth, 320) });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
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
    <div className={styles.chartShell}>
      <div className={styles.chartBox} ref={wrapRef} aria-label="Theme compare chart" />
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
