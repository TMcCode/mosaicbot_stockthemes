import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import { isShortThemeName } from "@/lib/shortThemeChart";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";

const TOP_N = 50;
const BOTTOM_N = 50;

/**
 * Map ETL `home_top_movers` rows to marquee items.
 *
 * Prefer rebuilding from `compare_themes` via {@link buildTopMoversTickerItems} when that
 * bundle is available (correct short-theme PnL + full re-rank). This path is a fallback:
 * correct display for shorts, then re-rank within the published top/bottom slices.
 */
export function pickHomeTopMovers(
  bundle: HomeTopMoversV0 | null | undefined,
  period: TopMoverTickerPeriod,
): TopMoverTickerItem[] {
  if (!bundle) return [];
  const rows = period === "10D" ? bundle.movers_10d : bundle.movers_1d;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const corrected: { slug: string; name: string; returnPct: number }[] = [];
  for (const row of rows) {
    const name = String(row.name || "").trim();
    const slug = String(row.slug || "").trim();
    if (!slug || !name) continue;
    let returnPct = Number(row.return_pct);
    if (!Number.isFinite(returnPct)) continue;
    // Legacy movers: ranked on long 1D/10D; flag missing or return still long-signed.
    if (isShortThemeName(name) && row.short_display_inverted !== true) {
      returnPct = Math.round(-returnPct * 10_000) / 10_000;
    }
    corrected.push({ slug, name, returnPct });
  }

  if (corrected.length === 0) return [];

  corrected.sort((a, b) => b.returnPct - a.returnPct || a.slug.localeCompare(b.slug));

  const top = corrected.slice(0, TOP_N).map((row, i) => ({
    ...row,
    tier: "top" as const,
    rank: i + 1,
  }));
  const bottomSlice = corrected.length > TOP_N ? corrected.slice(-BOTTOM_N) : [];
  const bottom = bottomSlice
    .sort((a, b) => a.returnPct - b.returnPct || a.slug.localeCompare(b.slug))
    .map((row, i) => ({
      ...row,
      tier: "bottom" as const,
      rank: i + 1,
    }));

  return [...top, ...bottom];
}
