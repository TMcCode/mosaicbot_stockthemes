import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";

export type TopMoverTickerItem = {
  slug: string;
  name: string;
  pct1d: number;
  tier: "top" | "bottom";
  rank: number;
};

const TICKER_COLUMN = "1D";
const TOP_N = 50;
const BOTTOM_N = 50;

/**
 * Rank themes by 1D % for the home marquee: top 50 gainers, then bottom 50 losers.
 * Uses compare_themes bundle only (no per-theme detail fetches).
 */
export function buildTopMoversTickerItems(rows: CompareThemesRowV0[]): TopMoverTickerItem[] {
  const scored: { slug: string; name: string; pct1d: number }[] = [];

  for (const row of rows) {
    const slug = String(row.slug || "").trim();
    const name = String(row.name || "").trim();
    if (!slug || !name) continue;
    const pct1d = valueForTrendingColumn(TICKER_COLUMN, row.compare_returns ?? undefined, {});
    if (pct1d == null || !Number.isFinite(pct1d)) continue;
    scored.push({ slug, name, pct1d });
  }

  if (scored.length === 0) return [];

  scored.sort((a, b) => b.pct1d - a.pct1d);

  const top = scored.slice(0, TOP_N).map((row, i) => ({
    ...row,
    tier: "top" as const,
    rank: i + 1,
  }));

  const bottomSlice = scored.length > TOP_N ? scored.slice(-BOTTOM_N) : [];
  const bottom = bottomSlice
    .sort((a, b) => a.pct1d - b.pct1d)
    .map((row, i) => ({
      ...row,
      tier: "bottom" as const,
      rank: i + 1,
    }));

  return [...top, ...bottom];
}
