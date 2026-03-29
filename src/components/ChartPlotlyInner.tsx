"use client";

import { useEffect, useRef, useState } from "react";
import type { Config, Data, Layout } from "plotly.js";
import * as Plotly from "plotly.js-dist-min";

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

const BG = "#0f1115";
const GRID = "rgba(255,255,255,0.06)";
const TEXT = "#a6abb9";

export type ChartPlotlyInnerProps = {
  chart1y: ThemeChart1yV0 | undefined;
};

export function ChartPlotlyInner({ chart1y }: ChartPlotlyInnerProps) {
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
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

  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (activeView === "performance" && !hasPerf) return;
    if (activeView === "composition" && !hasComp) return;

    const w = Math.max(el.clientWidth, 200);
    const h = activeView === "composition" ? 460 : 420;

    const traces: Data[] = [];
    if (activeView === "performance" && perf?.dates && perf?.values) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: perf.aggregation ?? "Performance",
        x: perf.dates,
        y: perf.values.map(Number),
        line: { color: "#26fcd6", width: 2 },
        hovertemplate: "%{x}<br>%{y:.2f}<extra></extra>",
      });
    } else if (activeView === "composition" && comp?.series) {
      comp.series.forEach((s, i) => {
        if (!s.dates?.length || !s.values?.length) return;
        traces.push({
          type: "scatter",
          mode: "lines",
          name: s.ticker,
          x: s.dates,
          y: s.values.map(Number),
          line: { color: PALETTE[i % PALETTE.length], width: 2 },
          hovertemplate: `${s.ticker}<br>%{x}<br>%{y:.2f}<extra></extra>`,
        });
      });
    }

    if (traces.length === 0) return;

    const layout: Partial<Layout> = {
      autosize: true,
      width: w,
      height: h,
      paper_bgcolor: BG,
      plot_bgcolor: BG,
      font: { family: "var(--font-geist-sans), system-ui, sans-serif", size: 12, color: TEXT },
      margin: { l: 56, r: 24, t: 16, b: 48 },
      showlegend: activeView === "composition",
      legend: {
        orientation: "h",
        yanchor: "top",
        y: -0.22,
        x: 0,
        bgcolor: "transparent",
        font: { color: TEXT, size: 11 },
      },
      xaxis: {
        gridcolor: GRID,
        linecolor: GRID,
        tickfont: { color: TEXT },
        showgrid: true,
        zeroline: false,
      },
      yaxis: {
        gridcolor: GRID,
        linecolor: GRID,
        tickfont: { color: TEXT },
        showgrid: true,
        zeroline: false,
        title:
          activeView === "performance"
            ? { text: "Indexed (100 = start)", font: { size: 11, color: TEXT } }
            : undefined,
      },
    };

    const config: Partial<Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
      scrollZoom: true,
    };

    let cancelled = false;
    void Plotly.newPlot(el, traces, layout, config).then(() => {
      if (cancelled) return;
      Plotly.Plots.resize(el);
    });

    const ro = new ResizeObserver(() => {
      if (!elRef.current) return;
      Plotly.Plots.resize(elRef.current);
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      Plotly.purge(el);
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
      <div ref={elRef} className={styles.chartBox} />
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
