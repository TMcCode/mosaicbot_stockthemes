/**
 * Mirrors docs/stockthemes/schemas/search_index.v0.schema.json in MosaicBot.
 */
export type SearchIndexTickerRowV0 = {
  ticker: string;
  name?: string;
  theme_slugs: string[];
  theme_names: string[];
  aliases: string[];
};

export type SearchIndexThemeRowV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
  group_name?: string | null;
  aliases: string[];
};

export type SearchIndexGroupRowV0 = {
  slug: string;
  name: string;
  spy_sector?: string;
  blurb_snippet?: string;
  aliases: string[];
};

export type SearchIndexV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string | null;
  tickers: SearchIndexTickerRowV0[];
  themes: SearchIndexThemeRowV0[];
  groups: SearchIndexGroupRowV0[];
};
