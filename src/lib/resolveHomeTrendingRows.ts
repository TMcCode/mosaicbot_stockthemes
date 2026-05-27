import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { computePerfFromChartPerformance } from "@/lib/computeThemePerf";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { HomeTrendingRowV0, HomeTrendingV0 } from "@/types/home_trending.v0";
import type { ManifestV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type HomeTrendingDetailRow = {
  slug: string | null;
  name: string;
  chart1y: ThemeChart1yV0 | undefined;
  chartPerf: ChartPerfReturns;
  compare_returns?: ThemeCompareReturnsV0;
  marketBaseline?: boolean;
};

function normThemeName(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function indexHomeTrendingRows(rows: HomeTrendingRowV0[]): {
  byName: Map<string, HomeTrendingRowV0>;
  bySlug: Map<string, HomeTrendingRowV0>;
} {
  const byName = new Map<string, HomeTrendingRowV0>();
  const bySlug = new Map<string, HomeTrendingRowV0>();
  for (const row of rows) {
    const nameKey = normThemeName(row.name);
    if (nameKey && !byName.has(nameKey)) {
      byName.set(nameKey, row);
    }
    const slug = String(row.slug || "").trim();
    if (slug) {
      bySlug.set(slug, row);
    }
  }
  return { byName, bySlug };
}

function indexCompareRows(rows: CompareThemesRowV0[]): {
  byName: Map<string, CompareThemesRowV0>;
  bySlug: Map<string, CompareThemesRowV0>;
} {
  const byName = new Map<string, CompareThemesRowV0>();
  const bySlug = new Map<string, CompareThemesRowV0>();
  for (const row of rows) {
    const nameKey = normThemeName(row.name);
    if (nameKey && !byName.has(nameKey)) {
      byName.set(nameKey, row);
    }
    const slug = String(row.slug || "").trim();
    if (slug) {
      bySlug.set(slug, row);
    }
  }
  return { byName, bySlug };
}

function rowFromSources(
  manifestName: string,
  themeSlug: string | null | undefined,
  homeRow: HomeTrendingRowV0 | undefined,
  compareRow: CompareThemesRowV0 | undefined,
): HomeTrendingDetailRow {
  const name =
    String(homeRow?.name || compareRow?.name || manifestName || "").trim() || "—";
  const slug = (homeRow?.slug ?? compareRow?.slug ?? themeSlug ?? null) as string | null;
  const chart1y = (homeRow?.chart_1y ?? undefined) as ThemeChart1yV0 | undefined;
  const compare_returns = (homeRow?.compare_returns ??
    compareRow?.compare_returns ??
    undefined) as ThemeCompareReturnsV0 | undefined;
  return {
    slug,
    name,
    chart1y,
    chartPerf: computePerfFromChartPerformance(chart1y?.performance),
    compare_returns,
  };
}

/**
 * Build trending table rows in manifest order without per-theme detail JSON fetches.
 * Merges home_trending.v0.json and compare_themes.v0.json by theme name/slug.
 */
export function resolveHomeTrendingRows(
  trendingNames: string[],
  manifest: ManifestV0,
  homeBundle: HomeTrendingV0 | null | undefined,
  compareRows: CompareThemesRowV0[] | undefined,
): HomeTrendingDetailRow[] {
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const homeIdx = indexHomeTrendingRows(homeBundle?.rows ?? []);
  const compareIdx = indexCompareRows(compareRows ?? []);

  return trendingNames.map((rawName) => {
    const manifestName = String(rawName || "").trim();
    const nameKey = normThemeName(manifestName);
    const theme = manifestName ? themeByName.get(manifestName) : undefined;
    const themeSlug = theme?.slug ? String(theme.slug).trim() : null;

    const homeRow =
      (nameKey ? homeIdx.byName.get(nameKey) : undefined) ??
      (themeSlug ? homeIdx.bySlug.get(themeSlug) : undefined);
    const compareRow =
      (nameKey ? compareIdx.byName.get(nameKey) : undefined) ??
      (themeSlug ? compareIdx.bySlug.get(themeSlug) : undefined);

    return rowFromSources(manifestName, themeSlug, homeRow, compareRow);
  });
}
