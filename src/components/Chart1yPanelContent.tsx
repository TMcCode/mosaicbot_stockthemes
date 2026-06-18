"use client";

import { memo } from "react";

import { Chart1yLightweight } from "@/components/Chart1yLightweight";
import { chart1yHasRenderableSeries } from "@/lib/chart1yRenderable";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";
import type { CompositionMeta } from "@/lib/constituentMeta";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

export type Chart1yPanelProps = {
  chart1y: ThemeChart1yV0 | undefined;
  compositionMetaByTicker?: Record<string, CompositionMeta>;
  performanceTitle?: string;
  /**
   * When false, composition legend omits the middle “badge” (series id).
   * Use for **group** charts where `series[].ticker` is a theme slug; keep true for **theme** charts (stock tickers).
   */
  compositionLegendShowSeriesBadge?: boolean;
  /** When false, composition legend omits the market-cap column (group ticker preview still shows when present). */
  compositionLegendShowMcap?: boolean;
  /** Optional benchmark overlay for performance view (e.g., S&P 500). */
  benchmarkPerformance?: ChartPerformanceV0;
  /** When set (even `[]`), enables in-chart period controls without extra network requests. */
  selectedDates?: ManifestSelectedDateV0[];
  /** Lazy-loads extended performance for 2Y/5Y/custom windows via slim chart sidecar. */
  sidecarEntity?: { kind: "theme" | "group"; slug: string };
};

/**
 * Heavy chart subtree (`lightweight-charts`). Loaded only via `next/dynamic` from `Chart1yPanel.tsx`.
 */
function Chart1yPanelInner({
  chart1y,
  compositionMetaByTicker,
  performanceTitle,
  compositionLegendShowSeriesBadge = true,
  compositionLegendShowMcap = true,
  benchmarkPerformance,
  selectedDates,
  sidecarEntity,
}: Chart1yPanelProps) {
  if (!chart1yHasRenderableSeries(chart1y)) {
    return null;
  }
  return (
    <Chart1yLightweight
      chart1y={chart1y}
      compositionMetaByTicker={compositionMetaByTicker}
      performanceTitle={performanceTitle}
      compositionLegendShowSeriesBadge={compositionLegendShowSeriesBadge}
      compositionLegendShowMcap={compositionLegendShowMcap}
      benchmarkPerformance={benchmarkPerformance}
      selectedDates={selectedDates}
      sidecarEntity={sidecarEntity}
    />
  );
}

export const Chart1yPanel = memo(Chart1yPanelInner);
