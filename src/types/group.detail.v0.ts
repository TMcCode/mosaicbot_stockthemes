/**
 * Mirrors docs/stockthemes/schemas/group.detail.v0.schema.json in MosaicBot.
 */
export type GroupDetailChildThemeV0 = {
  slug: string;
  name: string;
  ticker_count?: number;
  group_slug?: string;
};

export type GroupDetailV0 = {
  schema_version: 0;
  slug: string;
  name: string;
  as_of: string;
  build_id?: string;
  theme_count?: number;
  ticker_count?: number;
  theme_slugs?: string[];
  seo_intro?: string;
  themes: GroupDetailChildThemeV0[];
};
