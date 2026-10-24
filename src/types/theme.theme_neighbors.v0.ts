export type ThemeNeighborRowV0 = {
  slug: string;
  theme: string;
  correlation: number;
  overlapping_ticker_count?: number;
};

/** Pre-ranked display lists from ETL — render as-is (no client filter/sort). */
export type ThemeThemeNeighborsV0 = {
  schema_version: "theme.theme_neighbors.v0";
  slug: string;
  theme?: string;
  as_of?: string;
  window: string;
  agg_type: string;
  group?: string;
  in_group_total: number;
  closest_in_group: ThemeNeighborRowV0[];
  furthest_in_group: ThemeNeighborRowV0[];
  closest_across: ThemeNeighborRowV0[];
  furthest_outside: ThemeNeighborRowV0[];
};
