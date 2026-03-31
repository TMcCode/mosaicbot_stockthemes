/**
 * Mirrors docs/stockthemes/schemas/manifest.v0.schema.json in MosaicBot.
 * ETL will emit the real file; this app only consumes JSON.
 */
export type ManifestNewThemeEventV0 = {
  name: string;
  first_seen_at: string;
};

export type ManifestUpdatedThemeEventV0 = {
  name: string;
  first_seen_at: string;
  last_content_change_at: string;
};

export type ManifestV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  home_intro?: string;
  trending_themes?: string[];
  new_themes?: string[];
  new_theme_events?: ManifestNewThemeEventV0[];
  updated_themes?: string[];
  updated_theme_events?: ManifestUpdatedThemeEventV0[];
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
  blurb?: string;
  industry_id?: string | null;
  spy_sector?: string;
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
