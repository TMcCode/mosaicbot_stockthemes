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

export type ManifestHomeFeedEventV0 = {
  kind: "theme_new" | "theme_updated" | "text_table_update" | "theme_change";
  event_at: string;
  title: string;
  summary?: string;
  note?: string;
  changes_preview?: string[];
  changes_more_count?: number;
  theme_name?: string;
  theme_slug?: string;
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
  home_feed_events?: ManifestHomeFeedEventV0[];
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
  /** ISO 8601 UTC from Theme_Metadata.created_at (optional until backfilled) */
  created_at?: string;
  /** ISO 8601 UTC from Theme_Metadata.updated_at */
  updated_at?: string;
};
