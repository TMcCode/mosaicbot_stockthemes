"use client";

import { Chart1yLightweight } from "@/components/Chart1yLightweight";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { CompositionMeta } from "@/lib/constituentMeta";

/**
 * ~1Y chart uses TradingView Lightweight Charts (same family as TradingView), bundled in the main JS
 * bundle — reliable for `output: "export"` / static hosting. Plotly was removed (heavy lazy chunk,
 * easy to mis-path with basePath / static servers).
 */
export type Chart1yPanelProps = {
  chart1y: ThemeChart1yV0 | undefined;
  compositionMetaByTicker?: Record<string, CompositionMeta>;
};

export function Chart1yPanel({ chart1y, compositionMetaByTicker }: Chart1yPanelProps) {
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );
  if (!hasPerf && !hasComp) {
    return null;
  }
  return <Chart1yLightweight chart1y={chart1y} compositionMetaByTicker={compositionMetaByTicker} />;
}
