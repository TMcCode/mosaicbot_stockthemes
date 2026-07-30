import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";

/** GICS sector SPDRs available on overlay chart (SPY is separate benchmark overlay). */
export const OVERLAY_SECTOR_SPDR_OPTIONS = [
  { ticker: "XLK", name: "Technology (XLK)" },
  { ticker: "XLC", name: "Communication Services (XLC)" },
  { ticker: "XLY", name: "Consumer Discretionary (XLY)" },
  { ticker: "XLI", name: "Industrials (XLI)" },
  { ticker: "XLF", name: "Financials (XLF)" },
  { ticker: "XLE", name: "Energy (XLE)" },
  { ticker: "XLB", name: "Materials (XLB)" },
  { ticker: "XLV", name: "Health Care (XLV)" },
  { ticker: "XLP", name: "Consumer Staples (XLP)" },
  { ticker: "XLU", name: "Utilities (XLU)" },
  { ticker: "XLRE", name: "Real Estate (XLRE)" },
] as const;

export type OverlaySectorEtfOption = (typeof OVERLAY_SECTOR_SPDR_OPTIONS)[number];

export type OverlaySectorEtfCatalogEntry = {
  ticker: string;
  name: string;
  performance?: ChartPerformanceV0;
  /** Live/session 1D % from etf_benchmarks compare_returns (for session-day chart tail). */
  dayReturnPct?: number | null;
};

export function overlaySectorItemKey(ticker: string): string {
  return `etf:${String(ticker || "").trim().toUpperCase()}`;
}

export function parseOverlaySectorItemKey(raw: string): string | null {
  const s = String(raw || "").trim();
  if (!s.startsWith("etf:")) return null;
  const ticker = s.slice(4).trim().toUpperCase();
  return ticker || null;
}

function dayReturnPctFromCompareMetrics(
  metrics: Record<string, number | null | undefined> | undefined,
): number | null {
  const raw = metrics?.["1D"];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

/** Sector SPDRs with indexed performance for overlay chart (excludes SPY). */
export function mapOverlaySectorEtfCatalog(
  bundle: EtfBenchmarksV0 | null | undefined,
): Record<string, OverlaySectorEtfCatalogEntry> {
  const out: Record<string, OverlaySectorEtfCatalogEntry> = {};
  for (const row of bundle?.rows ?? []) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker || ticker === "SPY") continue;
    const perf = row.performance;
    if (!perf?.dates?.length || !perf?.values?.length) continue;
    out[ticker] = {
      ticker,
      name: String(row.name || ticker).trim(),
      performance: perf,
      dayReturnPct: dayReturnPctFromCompareMetrics(row.compare_returns?.metrics),
    };
  }
  return out;
}

/** SPY row 1D from etf_benchmarks (when present). */
export function spyDayReturnPctFromEtfBenchmarks(
  bundle: EtfBenchmarksV0 | null | undefined,
): number | null {
  for (const row of bundle?.rows ?? []) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (ticker !== "SPY") continue;
    return dayReturnPctFromCompareMetrics(row.compare_returns?.metrics);
  }
  return null;
}
