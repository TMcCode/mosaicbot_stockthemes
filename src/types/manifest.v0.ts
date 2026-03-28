/**
 * Mirrors docs/stockthemes/schemas/manifest.v0.schema.json in MosaicBot.
 * ETL will emit the real file; this app only consumes JSON.
 */
export type ManifestV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  stats?: {
    total_tickers?: number;
    total_groups?: number;
    total_themes?: number;
    total_market_cap_usd?: number;
  };
  groups: ManifestGroupSummaryV0[];
  themes: ManifestThemeSummaryV0[];
};

export type ManifestGroupSummaryV0 = {
  slug: string;
  name: string;
  industry_id?: string | null;
  theme_count?: number;
  ticker_count?: number;
  theme_slugs?: string[];
};

export type ManifestThemeSummaryV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
  industry_id?: string | null;
  ticker_count?: number;
};
