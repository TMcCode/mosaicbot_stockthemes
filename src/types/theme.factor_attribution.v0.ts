export type ThemeFactorAttributionHorizon =
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "3Y"
  | "5Y"
  | "10Y";

export type ThemeFactorContributionV0 = {
  factor_id: string;
  label: string;
  contribution_pct: number;
  factor_return_pct: number;
  average_beta: number;
  confidence?: number;
};

export type ThemeFactorAttributionHorizonV0 = {
  actual_return_pct: number;
  explained_return_pct: number;
  theme_specific_return_pct: number;
  model_r2?: number;
  coverage_pct: number;
  sample_size: number;
  contributions: ThemeFactorContributionV0[];
};

export type ThemeConstituentFitV0 = {
  ticker: string;
  correlation_to_theme?: number;
  market_adjusted_correlation?: number;
  beta_to_theme?: number;
  theme_r2?: number;
  stock_specific_share?: number;
  sample_size: number;
  coverage_pct: number;
};

export type ThemeCohesionHorizonV0 = {
  median_correlation?: number;
  weighted_average_correlation?: number;
  market_adjusted_median_correlation?: number;
  dispersion?: number;
  pct_above_0_50?: number;
  pct_negative?: number;
  valid_constituents: number;
  coverage_pct: number;
  global_rank?: number;
  global_theme_count?: number;
  global_percentile?: number;
  market_adjusted_global_rank?: number;
  market_adjusted_global_theme_count?: number;
  market_adjusted_global_percentile?: number;
  group_rank?: number;
  group_theme_count?: number;
  group_percentile?: number;
  market_adjusted_group_rank?: number;
  market_adjusted_group_theme_count?: number;
  market_adjusted_group_percentile?: number;
  constituents: ThemeConstituentFitV0[];
};

export type ThemeFactorAttributionV0 = {
  schema_version: "theme.factor_attribution.v0";
  slug: string;
  as_of: string;
  methodology_version: string;
  history_method: "reconstructed_current_membership";
  horizons: Partial<
    Record<ThemeFactorAttributionHorizon, ThemeFactorAttributionHorizonV0>
  >;
  cohesion: Partial<Record<ThemeFactorAttributionHorizon, ThemeCohesionHorizonV0>>;
};
