import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

type StockDetailMerged = StockDetailV0 & {
  themes: StockThemeMembershipAppV0[];
  theme_heatmap_columns?: string[];
};

/**
 * Strip Tier B fields (weights, compare_returns, heatmap columns) so static HTML /
 * RSC Flight does not embed numeric stock sidecars. Client hydrates via `/cdn-app`.
 */
export function stockDetailPublicSeed(detail: StockDetailMerged): StockDetailV0 & {
  themes: StockThemeMembershipPublicV0[];
} {
  return {
    schema_version: detail.schema_version,
    ticker: detail.ticker,
    name: detail.name,
    as_of: detail.as_of,
    build_id: detail.build_id,
    ticker_performance_as_of: detail.ticker_performance_as_of,
    logo_url: detail.logo_url,
    seo_intro: detail.seo_intro,
    theme_count: detail.theme_count ?? detail.themes.length,
    themes: detail.themes.map((t) => ({
      slug: t.slug,
      name: t.name,
      group_slug: t.group_slug,
      group_name: t.group_name,
    })),
  };
}
