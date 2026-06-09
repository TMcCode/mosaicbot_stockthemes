import {
  TREEMAP_RETURN_PERIODS,
  type ConstituentTreemapNode,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import { isHeatmapSectorEligible, sortHeatmapSectors } from "@/lib/marketHeatmapSectors";
import { applyShortThemeCompareReturnsDisplay } from "@/lib/shortThemeChart";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ManifestGroupSummaryV0, ManifestThemeSummaryV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type MarketHeatmapMode = "group" | "theme";

export type MarketHeatmapTile = {
  slug: string;
  name: string;
  sector: string;
  /** Raw sizing weight (avg constituent mcap USD, or fallback). */
  weight: number;
  returns: Partial<Record<TreemapReturnColumn, number | null>>;
  href: string;
};

export type MarketHeatmapBuildInput = {
  mode: MarketHeatmapMode;
  groups: ManifestGroupSummaryV0[];
  themes: ManifestThemeSummaryV0[];
  compareRows: CompareThemesRowV0[];
};

function compareMetricsToReturns(
  compare: ThemeCompareReturnsV0 | undefined,
  themeName: string,
): Partial<Record<TreemapReturnColumn, number | null>> {
  const display = applyShortThemeCompareReturnsDisplay(compare, themeName);
  const m = display?.metrics;
  if (!m) return {};
  const out: Partial<Record<TreemapReturnColumn, number | null>> = {};
  for (const { key } of TREEMAP_RETURN_PERIODS) {
    const v = m[key];
    out[key] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

function themeSizingWeight(row: CompareThemesRowV0, theme: ManifestThemeSummaryV0): number {
  const mcap = row.avg_market_cap_usd;
  if (typeof mcap === "number" && Number.isFinite(mcap) && mcap > 0) return mcap;
  const tc = theme.ticker_count;
  if (typeof tc === "number" && tc > 0) return tc;
  return 1;
}

function groupSizingWeight(
  themeRows: { row: CompareThemesRowV0; theme: ManifestThemeSummaryV0 }[],
): number {
  let weighted = 0;
  let count = 0;
  for (const { row, theme } of themeRows) {
    const tc = theme.ticker_count ?? 0;
    const mcap = row.avg_market_cap_usd;
    if (typeof mcap === "number" && Number.isFinite(mcap) && mcap > 0 && tc > 0) {
      weighted += mcap * tc;
      count += tc;
    }
  }
  if (count > 0) return weighted / count;
  const totalTickers = themeRows.reduce((s, t) => s + (t.theme.ticker_count ?? 0), 0);
  if (totalTickers > 0) return totalTickers;
  return themeRows.length || 1;
}

function groupReturnsFromThemes(
  themeRows: { row: CompareThemesRowV0; theme: ManifestThemeSummaryV0 }[],
): Partial<Record<TreemapReturnColumn, number | null>> {
  const out: Partial<Record<TreemapReturnColumn, number | null>> = {};
  for (const { key } of TREEMAP_RETURN_PERIODS) {
    const vals: number[] = [];
    for (const { row, theme } of themeRows) {
      const v = valueForTrendingColumn(
        key,
        row.compare_returns ?? undefined,
        {},
        String(theme.name || row.name || ""),
      );
      if (v != null && Number.isFinite(v)) vals.push(v);
    }
    out[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return out;
}

export function buildMarketHeatmapNodes(input: MarketHeatmapBuildInput): MarketHeatmapTile[] {
  const groupSector = new Map<string, string>();
  for (const g of input.groups) {
    const slug = String(g.slug || "").trim();
    if (!slug || !isHeatmapSectorEligible(g.spy_sector)) continue;
    groupSector.set(slug, String(g.spy_sector).trim());
  }

  const compareBySlug = new Map<string, CompareThemesRowV0>();
  for (const row of input.compareRows) {
    const slug = String(row.slug || "").trim();
    if (slug) compareBySlug.set(slug, row);
  }

  const themeBySlug = new Map<string, ManifestThemeSummaryV0>();
  for (const t of input.themes) {
    const slug = String(t.slug || "").trim();
    if (slug) themeBySlug.set(slug, t);
  }

  if (input.mode === "theme") {
    const tiles: MarketHeatmapTile[] = [];
    for (const theme of input.themes) {
      const slug = String(theme.slug || "").trim();
      const name = String(theme.name || "").trim();
      const gslug = String(theme.group_slug || "").trim();
      const sector = groupSector.get(gslug);
      if (!slug || !name || !sector) continue;
      const row = compareBySlug.get(slug);
      if (!row?.compare_returns) continue;
      const weight = themeSizingWeight(row, theme);
      if (weight <= 0) continue;
      tiles.push({
        slug,
        name,
        sector,
        weight,
        returns: compareMetricsToReturns(row.compare_returns ?? undefined, name),
        href: `/themes/${encodeURIComponent(slug)}`,
      });
    }
    return tiles;
  }

  const themesByGroup = new Map<string, { row: CompareThemesRowV0; theme: ManifestThemeSummaryV0 }[]>();
  for (const theme of input.themes) {
    const gslug = String(theme.group_slug || "").trim();
    if (!gslug || !groupSector.has(gslug)) continue;
    const slug = String(theme.slug || "").trim();
    const row = compareBySlug.get(slug);
    if (!row?.compare_returns) continue;
    const bucket = themesByGroup.get(gslug) ?? [];
    bucket.push({ row, theme });
    themesByGroup.set(gslug, bucket);
  }

  const tiles: MarketHeatmapTile[] = [];
  for (const g of input.groups) {
    const slug = String(g.slug || "").trim();
    const name = String(g.name || "").trim();
    const sector = groupSector.get(slug);
    if (!slug || !name || !sector) continue;
    const childThemes = themesByGroup.get(slug);
    if (!childThemes?.length) continue;
    const weight = groupSizingWeight(childThemes);
    if (weight <= 0) continue;
    tiles.push({
      slug,
      name,
      sector,
      weight,
      returns: groupReturnsFromThemes(childThemes),
      href: `/groups/${encodeURIComponent(slug)}`,
    });
  }
  return tiles;
}

export function marketHeatmapSectorsFromTiles(tiles: MarketHeatmapTile[]): string[] {
  return sortHeatmapSectors(tiles.map((t) => t.sector));
}

/** Adapter for shared treemap period picker. */
export function marketHeatmapTilesAsTreemapNodes(tiles: MarketHeatmapTile[]): ConstituentTreemapNode[] {
  const total = tiles.reduce((s, t) => s + t.weight, 0);
  if (total <= 0) return [];
  return tiles.map((t) => ({
    ticker: t.slug,
    name: t.name,
    weight: (t.weight / total) * 100,
    returns: t.returns,
  }));
}
