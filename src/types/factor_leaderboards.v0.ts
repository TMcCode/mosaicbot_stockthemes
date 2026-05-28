export type FactorLeaderboardEntryV0 = {
  theme: string;
  slug?: string | null;
  /** Incremental exposure rank (multivariate). */
  rank: number;
  total: number;
  /** Incremental exposure score 0–100 (multivariate). */
  score: number;
  /** Co-movement / standalone score 0–100 (univariate vs factor alone). */
  score_standalone?: number | null;
  /** Co-movement rank (univariate). */
  rank_standalone?: number | null;
  confidence?: number | null;
  corr_63d?: number | null;
  corr_252d?: number | null;
};

export type FactorLeaderboardBucketV0 = {
  label: string;
  entries: FactorLeaderboardEntryV0[];
};

export type FactorLeaderboardsV0 = {
  schema_version: "factor_leaderboards.v0";
  as_of?: string | null;
  generated_at?: string | null;
  factors: Record<string, FactorLeaderboardBucketV0>;
};
