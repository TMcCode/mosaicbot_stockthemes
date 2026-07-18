import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

/** Keep the live table/treemap seed while excluding large chart composition arrays from Flight. */
export function themeDetailLiveSeed(detail: ThemeDetailV0): ThemeDetailV0 {
  const seed = { ...detail };
  delete seed.chart_1y;
  return seed;
}

/** Embed the lightweight aggregate line; composition hydrates from the existing CDN detail. */
export function themeChartPerformanceSeed(
  detail: ThemeDetailV0,
): ThemeChart1yV0 | undefined {
  const performance = detail.chart_1y?.performance;
  if (!performance?.dates?.length || !performance.values?.length) return undefined;
  return { performance };
}
