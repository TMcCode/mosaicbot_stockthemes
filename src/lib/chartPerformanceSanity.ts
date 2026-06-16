import type { ChartPerformanceV0 } from "@/types/chart.v0";

/** Reject sidecar tails with a bogus cliff (e.g. chained slim row scaled to ~0). */
export function isSuspiciousChartPerformanceCliff(
  candidate: ChartPerformanceV0,
  baseline?: ChartPerformanceV0 | null,
): boolean {
  const vals = (candidate.values ?? []).map((v) => Number(v));
  if (vals.length < 2) return true;
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  if (!Number.isFinite(last) || !Number.isFinite(prev)) return true;
  if (prev > 10 && last < prev * 0.2) return true;
  if (prev > 50 && last < 5) return true;
  const baseVals = (baseline?.values ?? []).map((v) => Number(v));
  if (baseVals.length >= 1) {
    const baseLast = baseVals[baseVals.length - 1];
    if (Number.isFinite(baseLast) && baseLast > 10 && last < baseLast * 0.2) return true;
  }
  return false;
}
