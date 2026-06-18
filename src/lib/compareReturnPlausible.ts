/** Hard ceilings for compare_returns.metrics (matches ETL top-movers spirit; blocks corrupt parquet tails). */
const HARD_MAX_ABS: Record<string, number> = {
  "1D": 50,
  "10D": 150,
  MTD: 200,
  YTD: 500,
  Period: 800,
};

export function isPlausibleCompareReturnMetric(
  key: string,
  value: number | null | undefined,
): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  const cap = HARD_MAX_ABS[key];
  if (cap != null && Math.abs(value) > cap) return false;
  return true;
}

export function medianFinite(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
