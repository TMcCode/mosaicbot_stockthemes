import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";

export type TopMoverTickerPeriod = "1D" | "10D";

export type TopMoverTickerItem = {
  slug: string;
  name: string;
  returnPct: number;
  tier: "top" | "bottom";
  rank: number;
};

const TOP_N = 50;
const BOTTOM_N = 50;

const ET_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
});

/** Weekends use 10D % (markets closed); weekdays use 1D %. Same compare bundle — no extra fetch. */
export function homeTopMoversTickerPeriod(at: Date = new Date()): TopMoverTickerPeriod {
  const day = ET_WEEKDAY.format(at);
  return day === "Sat" || day === "Sun" ? "10D" : "1D";
}

/**
 * Rank themes for the home marquee: top 50 gainers, then bottom 50 losers.
 * Uses compare_themes bundle only (no per-theme detail fetches).
 */
export function buildTopMoversTickerItems(
  rows: CompareThemesRowV0[],
  options?: {
    period?: TopMoverTickerPeriod;
    at?: Date;
    /** Chart-derived 1D/10D when compare_returns.metrics omits a column (same as trending table). */
    chartPerfBySlug?: Map<string, ChartPerfReturns>;
  },
): TopMoverTickerItem[] {
  const column = options?.period ?? homeTopMoversTickerPeriod(options?.at);
  const chartBySlug = options?.chartPerfBySlug;
  const scored: { slug: string; name: string; returnPct: number }[] = [];

  for (const row of rows) {
    const slug = String(row.slug || "").trim();
    const name = String(row.name || "").trim();
    if (!slug || !name) continue;
    const chartFallback = chartBySlug?.get(slug) ?? {};
    const returnPct = valueForTrendingColumn(
      column,
      row.compare_returns ?? undefined,
      chartFallback,
    );
    if (returnPct == null || !Number.isFinite(returnPct)) continue;
    scored.push({ slug, name, returnPct });
  }

  if (scored.length === 0) return [];

  scored.sort((a, b) => b.returnPct - a.returnPct);

  const top = scored.slice(0, TOP_N).map((row, i) => ({
    ...row,
    tier: "top" as const,
    rank: i + 1,
  }));

  const bottomSlice = scored.length > TOP_N ? scored.slice(-BOTTOM_N) : [];
  const bottom = bottomSlice
    .sort((a, b) => a.returnPct - b.returnPct)
    .map((row, i) => ({
      ...row,
      tier: "bottom" as const,
      rank: i + 1,
    }));

  return [...top, ...bottom];
}
