"use client";

import dynamic from "next/dynamic";

import { ChartLoadingBar } from "@/components/ChartLoadingBar";
import type { ThemeChart1yV0 } from "@/types/chart.v0";

// --- Active: Plotly (lazy chunk + loading bar) ---
const ChartPlotlyInner = dynamic(
  () => import("./ChartPlotlyInner").then((m) => m.ChartPlotlyInner),
  { ssr: false, loading: () => <ChartLoadingBar /> },
);

// --- Revert to TradingView Lightweight Charts: uncomment below and remove the Plotly block above + ChartPlotlyInner usage in Chart1yPanel. ---
// import { Chart1yPanelLightweightChartsLegacy } from "./Chart1yPanel.lightweight-charts.legacy";

export type Chart1yPanelProps = {
  chart1y: ThemeChart1yV0 | undefined;
};

/**
 * Plotly charts load in a separate chunk after the page shell; a loading bar shows until ready.
 * Legacy TradingView implementation: `Chart1yPanel.lightweight-charts.legacy.tsx`.
 */
export function Chart1yPanel({ chart1y }: Chart1yPanelProps) {
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );
  if (!hasPerf && !hasComp) {
    return null;
  }
  return <ChartPlotlyInner chart1y={chart1y} />;

  // Revert (no lazy load for lightweight-charts):
  // return <Chart1yPanelLightweightChartsLegacy chart1y={chart1y} />;
}
