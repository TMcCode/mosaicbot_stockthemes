import type { ThemeCompareReturnsV0, ThemeRank10dV0 } from "@/types/theme.detail.v0";

export type CompareThemesRowV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
  group_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  manual_weights_updated_at?: string | null;
  compare_returns?: ThemeCompareReturnsV0 | null;
  rank_10d?: ThemeRank10dV0 | null;
};

export type CompareThemesV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  columns?: string[];
  rows: CompareThemesRowV0[];
};
