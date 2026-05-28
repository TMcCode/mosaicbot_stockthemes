/** Mirrors ETL `build_factor_profile_sidecar` / themes/<slug>.factor_profile.v0.json */

export type ThemeFactorScoreEntryV0 = {
  id: string;
  label: string;
  /** Incremental exposure score (multivariate). */
  score: number;
  /** Co-movement score (univariate vs factor alone). */
  score_standalone?: number | null;
  confidence?: number | null;
  rank?: number | null;
  rank_standalone?: number | null;
  total?: number | null;
};

export type ThemeFactorProfileV0 = {
  schema_version: "theme.factor_profile.v0";
  as_of?: string;
  model_r2?: number | null;
  confidence?: number | null;
  factors_positive?: ThemeFactorScoreEntryV0[];
  factors_negative?: ThemeFactorScoreEntryV0[];
  dominant_sector?: ThemeFactorScoreEntryV0 | null;
};
