import type { FactorLeaderboardEntryV0 } from "@/types/factor_leaderboards.v0";

export type FactorRowsV0 = {
  schema_version: "factor_rows.v0";
  factor_id: string;
  label: string;
  as_of?: string | null;
  entries: FactorLeaderboardEntryV0[];
};

