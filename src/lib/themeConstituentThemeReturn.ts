import type { ConstituentEarningsColumnId } from "@/lib/constituentEarningsColumnHelp";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/** Map constituent earnings columns → theme compare_returns metric keys. */
export const THEME_EARNINGS_COMPARE_METRIC: Partial<Record<ConstituentEarningsColumnId, string>> = {
  earnings_move: "LstRpt %",
  since_last_report: "SinceLstRpt",
};

export function themeManualWeightReturnPct(
  columnKey: string,
  compare: ThemeCompareReturnsV0 | undefined,
  themeName: string,
): number | null {
  const v = valueForTrendingColumn(columnKey, compare, {}, themeName);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function hasThemeManualWeightReturns(
  compare: ThemeCompareReturnsV0 | undefined,
  periodColumns: string[],
  view: "returns" | "earnings",
): boolean {
  const m = compare?.metrics;
  if (!m || typeof m !== "object") return false;
  if (view === "returns") {
    return periodColumns.some((col) => {
      const v = m[col];
      return typeof v === "number" && Number.isFinite(v);
    });
  }
  return Object.values(THEME_EARNINGS_COMPARE_METRIC).some((key) => {
    if (!key) return false;
    const v = m[key];
    return typeof v === "number" && Number.isFinite(v);
  });
}
