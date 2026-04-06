"use client";

import { memo } from "react";

import { Chart1yLightweight } from "@/components/Chart1yLightweight";
import { chart1yHasRenderableSeries } from "@/lib/chart1yRenderable";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { CompositionMeta } from "@/lib/constituentMeta";

export type Chart1yPanelProps = {
  chart1y: ThemeChart1yV0 | undefined;
  compositionMetaByTicker?: Record<string, CompositionMeta>;
  performanceTitle?: string;
  /**
   * When false, composition legend omits the middle “badge” (series id).
   * Use for **group** charts where `series[].ticker` is a theme slug; keep true for **theme** charts (stock tickers).
   */
  compositionLegendShowSeriesBadge?: boolean;
};

/**
 * Heavy chart subtree (`lightweight-charts`). Loaded only via `next/dynamic` from `Chart1yPanel.tsx`.
 */
function Chart1yPanelInner({
  chart1y,
  compositionMetaByTicker,
  performanceTitle,
  compositionLegendShowSeriesBadge = true,
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
    />
  );
}

export const Chart1yPanel = memo(Chart1yPanelInner);
