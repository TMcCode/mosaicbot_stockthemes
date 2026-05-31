import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type CompareBenchmarkRow = {
  slug: string;
  name: string;
  ticker: string;
  marketBaseline: true;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

export function mapEtfBenchmarksToCompareRows(
  bundle: EtfBenchmarksV0 | null | undefined,
): CompareBenchmarkRow[] {
  return (bundle?.rows ?? []).map((row) => {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    return {
      slug: ticker ? `benchmark:${ticker}` : "benchmark",
      name: String(row.name || ticker).trim(),
      ticker,
      marketBaseline: true as const,
      compareReturns: row.compare_returns ?? undefined,
    };
  });
}

/** LstRpt horizons are theme-earnings metrics; ETFs always show em dash. */
export function isCompareEarningsColumn(columnKey: string): boolean {
  return columnKey === "LstRpt %" || columnKey === "SinceLstRpt";
}
