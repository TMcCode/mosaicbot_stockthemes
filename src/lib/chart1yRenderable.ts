import type { ThemeChart1yV0 } from "@/types/chart.v0";

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
