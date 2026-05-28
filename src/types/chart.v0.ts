/** Shared chart payloads (theme.detail / group.detail JSON). */

export type ChartPerformanceV0 = {
  aggregation?: string;
  value_basis?: string;
  source?: string;
  /** Set by ETL when short-theme chart inversion was applied to `values`. */
  short_display_inverted?: boolean;
  dates: string[];
  values: number[];
};

export type ChartCompositionSeriesV0 = {
  ticker: string;
  name?: string;
  dates: string[];
  values: number[];
};

export type ChartCompositionIndexedV0 = {
  basis?: string;
  display?: string;
  source?: string;
  series: ChartCompositionSeriesV0[];
};

export type ThemeChart1yV0 = {
  performance?: ChartPerformanceV0;
  composition_indexed?: ChartCompositionIndexedV0;
};
