export type FactorLeaderboardEntryV0 = {
  theme: string;
  slug?: string | null;
  rank: number;
  total: number;
  score: number;
  confidence?: number | null;
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
