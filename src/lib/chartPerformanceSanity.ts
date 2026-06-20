import type { ChartPerformanceV0 } from "@/types/chart.v0";

const MAX_INDEXED_LEVEL = 10_000;
const MAX_DAILY_RATIO = 5;

function numericValues(values: (number | string)[] | undefined): number[] {
  return (values ?? []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
}

/** Reject sidecar tails with a bogus cliff (e.g. chained slim row scaled to ~0). */
export function isSuspiciousChartPerformanceCliff(
  candidate: ChartPerformanceV0,
  baseline?: ChartPerformanceV0 | null,
): boolean {
  const vals = numericValues(candidate.values);
  if (vals.length < 2) return true;
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  if (!Number.isFinite(last) || !Number.isFinite(prev)) return true;
  if (prev > 10 && last < prev * 0.2) return true;
  if (prev > 50 && last < 5) return true;
  if (isSuspiciousChartPerformanceSpike(candidate)) return true;
  const baseVals = numericValues(baseline?.values);
  if (baseVals.length >= 1) {
    const baseLast = baseVals[baseVals.length - 1];
    if (Number.isFinite(baseLast) && baseLast > 10 && last < baseLast * 0.2) return true;
    if (Number.isFinite(baseLast) && baseLast > 30 && last > baseLast * 2.5) return true;
  }
  return false;
}

/** Reject indexed performance with an implausible upward spike (bad ETL tail). */
export function isSuspiciousChartPerformanceSpike(perf: ChartPerformanceV0): boolean {
  const vals = numericValues(perf.values);
  if (vals.length < 2) return false;
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  if (!Number.isFinite(last) || !Number.isFinite(prev)) return true;
  if (Math.abs(last) > MAX_INDEXED_LEVEL) return true;
  if (Math.abs(prev) > 1e-6 && Math.abs(last) > Math.abs(prev) * MAX_DAILY_RATIO) return true;
  // Bad slim/matrix tail: e.g. 117 → 396 in one day on an indexed theme line.
  if (prev > 30 && last > prev * 2.5) return true;
  return false;
}

/** True when the last point is an implausible spike or cliff vs the prior point. */
export function isSuspiciousChartPerformanceTailPoint(perf: ChartPerformanceV0): boolean {
  return isSuspiciousChartPerformanceSpike(perf) || isSuspiciousChartPerformanceCliff(perf);
}

/** Strip trailing bogus spikes/cliffs before rendering or merging live chart data. */
export function sanitizeChartPerformanceForDisplay(
  perf: ChartPerformanceV0 | undefined,
): ChartPerformanceV0 | undefined {
  if (!perf?.dates?.length || !perf?.values?.length) return perf;
  const n = Math.min(perf.dates.length, perf.values.length);
  let dates = perf.dates.slice(0, n);
  let values = perf.values.slice(0, n).map((v) => Number(v));
  while (values.length >= 2 && isSuspiciousChartPerformanceTailPoint({ dates, values })) {
    dates = dates.slice(0, -1);
    values = values.slice(0, -1);
  }
  if (values.length < 2) return perf;
  if (dates.length === perf.dates.length && values.every((v, i) => v === Number(perf.values?.[i]))) {
    return perf;
  }
  return { ...perf, dates, values };
}
