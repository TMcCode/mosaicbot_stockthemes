"use client";

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
} from "lightweight-charts";

import type { ThemeChart1yV0 } from "@/types/chart.v0";

import styles from "./Chart1yPanel.module.css";

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

function toPoints(dates: string[], values: number[]) {
  const n = Math.min(dates.length, values.length);
  const out: { time: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ time: dates[i], value: Number(values[i]) });
  }
  return out;
}

export type Chart1yPanelProps = {
  chart1y: ThemeChart1yV0 | undefined;
};

export function Chart1yPanel({ chart1y }: Chart1yPanelProps) {
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(
    perf?.dates?.length && perf?.values?.length,
  );
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );

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

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (activeView === "performance" && !hasPerf) return;
    if (activeView === "composition" && !hasComp) return;

    const width = Math.max(el.clientWidth, 200);
    const height = activeView === "composition" ? 460 : 420;

    const chart = createChart(el, {
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
      },
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

    if (activeView === "performance" && perf?.dates && perf?.values) {
      const series = chart.addLineSeries({
        color: "#26fcd6",
        lineWidth: 2,
        title: perf.aggregation ?? "Performance",
      });
      series.setData(toPoints(perf.dates, perf.values));
    } else if (activeView === "composition" && comp?.series) {
      comp.series.forEach((s, i) => {
        if (!s.dates?.length || !s.values?.length) return;
        chart.addLineSeries({
          color: PALETTE[i % PALETTE.length],
          lineWidth: 2,
          title: s.ticker,
        }).setData(toPoints(s.dates, s.values));
      });
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: Math.max(wrapRef.current.clientWidth, 200),
      });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [chart1y, activeView, hasPerf, hasComp, perf, comp]);

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
      <div ref={wrapRef} className={styles.chartBox} />
      {hasComp && activeView === "composition" && comp?.series ? (
        <div className={styles.legend} aria-label="Series">
          {comp.series.map((s, i) => (
            <span key={s.ticker} className={styles.legendItem}>
              <span
                className={styles.swatch}
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              {s.ticker}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
