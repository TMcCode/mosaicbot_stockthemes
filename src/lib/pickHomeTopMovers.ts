import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import { isShortThemeName } from "@/lib/shortThemeChart";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

/** Use ETL pre-ranked marquee when published; caller falls back to scanning compare_themes. */
export function pickHomeTopMovers(
  bundle: HomeTopMoversV0 | null | undefined,
  period: TopMoverTickerPeriod,
): TopMoverTickerItem[] {
  if (!bundle) return [];
  const rows = period === "10D" ? bundle.movers_10d : bundle.movers_1d;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row) => {
    const name = String(row.name || "").trim();
    let returnPct = Number(row.return_pct);
    if (
      isShortThemeName(name) &&
      Number.isFinite(returnPct) &&
      row.short_display_inverted !== true
    ) {
      returnPct = Math.round(-returnPct * 10_000) / 10_000;
    }
    return {
      slug: String(row.slug || "").trim(),
      name,
      returnPct,
      tier: row.tier,
      rank: Number(row.rank),
    };
  });
}
