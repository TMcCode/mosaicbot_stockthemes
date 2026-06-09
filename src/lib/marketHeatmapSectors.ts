import type { TreemapReturnColumn } from "@/lib/buildConstituentTreemapNodes";
import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";

/** GICS sector name → sector SPDR ticker (11 GICS buckets on overlay chart). */
export const GICS_SECTOR_TO_SPDR: Record<string, string> = {
  "Information Technology": "XLK",
  "Communication Services": "XLC",
  "Consumer Discretionary": "XLY",
  Industrials: "XLI",
  Financials: "XLF",
  Energy: "XLE",
  Materials: "XLB",
  "Health Care": "XLV",
  "Consumer Staples": "XLP",
  Utilities: "XLU",
  "Real Estate": "XLRE",
};

/** Per-sector SPDR returns keyed by ``spy_sector`` (GICS only). */
export type HeatmapSectorSpdrReturns = Record<
  string,
  Partial<Record<TreemapReturnColumn, number | null>>
>;

const HEATMAP_SPDR_PERIODS: TreemapReturnColumn[] = ["1D", "10D", "MTD", "YTD", "Period"];

/** Build compact sector SPDR returns from ``etf_benchmarks.v0.json`` (no chart series). */
export function buildHeatmapSectorSpdrReturns(
  bundle: EtfBenchmarksV0 | null | undefined,
): HeatmapSectorSpdrReturns {
  const byTicker = new Map<string, Record<string, number | null>>();
  for (const row of bundle?.rows ?? []) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker) continue;
    const metrics = row.compare_returns?.metrics;
    if (metrics && typeof metrics === "object") {
      byTicker.set(ticker, metrics);
    }
  }

  const out: HeatmapSectorSpdrReturns = {};
  for (const [sector, ticker] of Object.entries(GICS_SECTOR_TO_SPDR)) {
    const metrics = byTicker.get(ticker);
    if (!metrics) continue;
    const returns: Partial<Record<TreemapReturnColumn, number | null>> = {};
    for (const key of HEATMAP_SPDR_PERIODS) {
      const v = metrics[key];
      returns[key] = typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    out[sector] = returns;
  }
  return out;
}

/** GICS + Macro/Other — matches admin ``SPY_SECTOR_OPTIONS`` order where possible. */
export const MARKET_HEATMAP_SECTOR_ORDER = [
  "Information Technology",
  "Communication Services",
  "Consumer Discretionary",
  "Industrials",
  "Financials",
  "Energy",
  "Materials",
  "Health Care",
  "Consumer Staples",
  "Utilities",
  "Real Estate",
  "Macro",
  "Other",
] as const;

const EXCLUDED_SECTOR = new Set(["", "unassigned"]);

/** Groups/themes without an explicit sector mapping are omitted from the market heatmap. */
export function isHeatmapSectorEligible(sector: string | null | undefined): sector is string {
  const s = String(sector ?? "").trim();
  if (!s) return false;
  return !EXCLUDED_SECTOR.has(s.toLowerCase());
}

export function sortHeatmapSectors(sectors: Iterable<string>): string[] {
  const set = new Set(sectors);
  const ordered = MARKET_HEATMAP_SECTOR_ORDER.filter((s) => set.has(s));
  const rest = [...set]
    .filter((s) => !MARKET_HEATMAP_SECTOR_ORDER.includes(s as (typeof MARKET_HEATMAP_SECTOR_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return [...ordered, ...rest];
}
