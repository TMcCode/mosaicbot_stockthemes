export type TopPicksThemeV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
};

/** Sheet-backed editor Top Picks for /compare (theme + group slug sets). */
export type TopPicksV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  label?: string;
  theme_slugs: string[];
  group_slugs: string[];
  themes?: TopPicksThemeV0[];
  unmatched_names?: string[];
};
