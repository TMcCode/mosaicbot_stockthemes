import type { ThemeChart1yV0 } from "@/types/chart.v0";

/** Drawable child-theme lines in a group composition chart. */
export function countRenderableCompositionSeries(chart1y: ThemeChart1yV0 | undefined): number {
  return (
    chart1y?.composition_indexed?.series?.filter((s) => s.dates?.length && s.values?.length)
      .length ?? 0
  );
}

/**
 * Group pages: baked static export can lag CDN after themes are added to a group.
 * Fetch when composition is missing or has fewer series than the current group membership.
 */
export function groupCompositionNeedsLiveRefresh(
  chart1y: ThemeChart1yV0 | undefined,
  expectedThemeCount: number | undefined,
): boolean {
  const expected = expectedThemeCount ?? 0;
  if (expected < 2) return false;
  const have = countRenderableCompositionSeries(chart1y);
  if (have < 2) return true;
  return have < expected;
}

/** True when `chart_1y` has performance and/or composition series worth rendering. */
export function chart1yHasRenderableSeries(chart1y: ThemeChart1yV0 | undefined): boolean {
  const perf = chart1y?.performance;
  const comp = chart1y?.composition_indexed;
  const hasPerf = Boolean(perf?.dates?.length && perf?.values?.length);
  const hasComp = Boolean(
    comp?.series?.some((s) => s.dates?.length && s.values?.length),
  );
  return hasPerf || hasComp;
}
