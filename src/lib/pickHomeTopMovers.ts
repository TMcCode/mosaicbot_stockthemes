import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

/** Use ETL pre-ranked marquee when published; caller falls back to scanning compare_themes. */
export function pickHomeTopMovers(
  bundle: HomeTopMoversV0 | null | undefined,
  period: TopMoverTickerPeriod,
): TopMoverTickerItem[] {
  if (!bundle) return [];
  const rows = period === "10D" ? bundle.movers_10d : bundle.movers_1d;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row) => ({
    slug: String(row.slug || "").trim(),
    name: String(row.name || "").trim(),
    returnPct: Number(row.return_pct),
    tier: row.tier,
    rank: Number(row.rank),
  }));
}
