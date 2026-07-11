import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";
import type { FactorSpreadsV0 } from "@/types/factor_spreads.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type CompareBenchmarkKind = "sector_etf" | "factor_spread";

export type CompareBenchmarkRow = {
  slug: string;
  name: string;
  /** Sector ETF ticker, or factor proxy formula for spreads. */
  ticker: string;
  marketBaseline: true;
  kind?: CompareBenchmarkKind;
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
      kind: "sector_etf" as const,
      compareReturns: row.compare_returns ?? undefined,
    };
  });
}

export function mapFactorSpreadsToCompareRows(
  bundle: FactorSpreadsV0 | null | undefined,
): CompareBenchmarkRow[] {
  return (bundle?.rows ?? []).map((row) => {
    const factorId = String(row.factor_id || "").trim();
    const proxy = String(row.proxy || "").trim();
    return {
      slug: factorId ? `factor-spread:${factorId}` : "factor-spread",
      name: String(row.name || factorId).trim(),
      ticker: proxy || factorId,
      marketBaseline: true as const,
      kind: "factor_spread" as const,
      compareReturns: row.compare_returns ?? undefined,
    };
  });
}

/** LstRpt horizons are theme-earnings metrics; ETFs / factor spreads always show em dash. */
export function isCompareEarningsColumn(columnKey: string): boolean {
  return columnKey === "LstRpt %" || columnKey === "SinceLstRpt";
}
