import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { applyShortThemeCompareReturnsDisplay } from "@/lib/shortThemeChart";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/** Map Compare parquet column → chart fallback field (when compare_returns missing). */
const CHART_FALLBACK: Record<string, keyof ChartPerfReturns> = {
  "1D": "d1",
  "10D": "d10",
  MTD: "mtd",
  YTD: "ytd",
  Period: "y1",
};

const DEFAULT_COLUMN_ORDER = ["1D", "Premarket", "10D", "MTD", "YTD", "Period", "2Y", "5Y"] as const;

/** /compare page: short horizons → earnings → calendar → custom SelectedDates. */
const COMPARE_COLUMN_ORDER = [
  "1D",
  "Premarket",
  "10D",
  "MTD",
  "LstRpt %",
  "SinceLstRpt",
  "YTD",
  "Period",
  "2Y",
  "5Y",
] as const;

const STANDARD_METRIC_KEYS = new Set<string>(DEFAULT_COLUMN_ORDER);

const COMPARE_STANDARD_KEYS = new Set<string>([
  ...COMPARE_COLUMN_ORDER,
  "1W",
  "Premarket",
]);

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

/** Column order for the full /compare table (includes LstRpt / SinceLstRpt). */
export function normalizeCompareColumnOrder(cols: string[]): string[] {
  if (!cols.length) return [...COMPARE_COLUMN_ORDER];
  const head: string[] = [];
  for (const k of COMPARE_COLUMN_ORDER) {
    if (cols.includes(k)) head.push(k);
  }
  const tail = cols.filter((c) => !COMPARE_STANDARD_KEYS.has(c) && !head.includes(c));
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
    SinceLstRpt: "Since LstRpt %",
    "LstRpt %": "LstRpt %",
    MTD: "MTD %",
    YTD: "YTD %",
    Period: "1Yr %",
    "2Y": "2Yr %",
    "5Y": "5Yr %",
  };
  if (labels[key]) return labels[key];
  return key.includes("%") ? key : `${key} %`;
}

/** /compare table headers — no trailing % so labels stay on one line. */
export function compareColumnHeader(key: string): string {
  const labels: Record<string, string> = {
    "1D": "1D",
    Premarket: "Pre",
    "10D": "10D",
    SinceLstRpt: "Since LstRpt",
    "LstRpt %": "LstRpt",
    MTD: "MTD",
    YTD: "YTD",
    Period: "1Yr",
    "2Y": "2Yr",
    "5Y": "5Yr",
  };
  if (labels[key]) return labels[key];
  return String(key).replace(/\s*%+\s*$/, "").trim();
}

const COMPARE_COLUMN_TOOLTIPS: Record<string, string> = {
  Premarket: "Return from prior session close through the latest premarket quote (4:00–9:30 AM ET).",
  "LstRpt %":
    "On average return since each ticker's last earnings report date.",
  SinceLstRpt:
    "On average returns for the two days after each ticker's last earnings date.",
};

/** Optional native tooltip for /compare metric headers. */
export function compareColumnHeaderTooltip(key: string): string | undefined {
  return COMPARE_COLUMN_TOOLTIPS[key];
}

export function valueForTrendingColumn(
  columnKey: string,
  compare: ThemeCompareReturnsV0 | undefined,
  chartFallback: ChartPerfReturns,
  themeName?: string,
): number | undefined {
  const displayCompare =
    themeName && compare
      ? applyShortThemeCompareReturnsDisplay(compare, themeName)
      : compare;
  const m = displayCompare?.metrics;
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
