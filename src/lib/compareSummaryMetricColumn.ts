export const COMPARE_SUMMARY_DEFAULT_METRIC = "10D";

const NAME_SORT_KEYS = new Set(["Theme", "Group"]);

export function isCompareNameSortKey(key: string): boolean {
  return NAME_SORT_KEYS.has(String(key || "").trim());
}

/**
 * Primary table sort → summary metric.
 * Name-column sort keeps ``lastMetricColumn`` (default 10D).
 */
export function resolveCompareSummaryMetricColumn(
  primarySortKey: string | null | undefined,
  lastMetricColumn: string | null | undefined,
  availableColumns?: readonly string[] | null,
): string {
  const primary = String(primarySortKey || "").trim();
  if (primary && !isCompareNameSortKey(primary)) {
    return primary;
  }
  const last = String(lastMetricColumn || "").trim();
  if (last && !isCompareNameSortKey(last)) {
    if (!availableColumns?.length || availableColumns.includes(last)) return last;
  }
  if (availableColumns?.includes(COMPARE_SUMMARY_DEFAULT_METRIC)) {
    return COMPARE_SUMMARY_DEFAULT_METRIC;
  }
  const firstMetric = (availableColumns || []).find((c) => c && !isCompareNameSortKey(c));
  return firstMetric || COMPARE_SUMMARY_DEFAULT_METRIC;
}
