import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/** Map Compare parquet column → chart fallback field (when compare_returns missing). */
const CHART_FALLBACK: Record<string, keyof ChartPerfReturns> = {
  "1D": "d1",
  "10D": "d10",
  MTD: "mtd",
  YTD: "ytd",
  Period: "y1",
};

const DEFAULT_COLUMN_ORDER = ["1D", "10D", "MTD", "YTD", "Period"] as const;

const STANDARD_METRIC_KEYS = new Set<string>(DEFAULT_COLUMN_ORDER);

/**
 * Parquet row column order can put ``Period`` (1Yr) first; homepage should show
 * 1D → 10D → MTD → YTD → 1Yr, then custom SelectedDates columns in source order.
 */
export function normalizeTrendingColumnOrder(cols: string[]): string[] {
  if (!cols.length) return [...DEFAULT_COLUMN_ORDER];
  const head: string[] = [];
  for (const k of DEFAULT_COLUMN_ORDER) {
    if (cols.includes(k)) head.push(k);
  }
  const tail = cols.filter((c) => !STANDARD_METRIC_KEYS.has(c));
  return [...head, ...tail];
}

export function resolveTrendingColumnOrder(
  rows: { compare_returns?: ThemeCompareReturnsV0 }[],
): string[] {
  for (const r of rows) {
    const c = r.compare_returns?.columns;
    if (c && c.length > 0) return normalizeTrendingColumnOrder(c);
  }
  return [...DEFAULT_COLUMN_ORDER];
}

export function trendingColumnHeader(key: string): string {
  const labels: Record<string, string> = {
    "1D": "1D %",
    "10D": "10D %",
    MTD: "MTD %",
    YTD: "YTD %",
    Period: "1Yr %",
  };
  if (labels[key]) return labels[key];
  return key.includes("%") ? key : `${key} %`;
}

export function valueForTrendingColumn(
  columnKey: string,
  compare: ThemeCompareReturnsV0 | undefined,
  chartFallback: ChartPerfReturns,
): number | undefined {
  const m = compare?.metrics;
  if (m && Object.prototype.hasOwnProperty.call(m, columnKey)) {
    const v = m[columnKey];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    /* null / missing numeric: still try chart for standard columns (e.g. sort keys) */
  }
  const fk = CHART_FALLBACK[columnKey];
  if (fk) {
    const v = chartFallback[fk];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}
