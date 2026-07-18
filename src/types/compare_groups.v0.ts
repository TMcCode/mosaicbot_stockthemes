import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type CompareGroupsRowV0 = {
  slug: string;
  name: string;
  theme_count?: number | null;
  spy_sector?: string | null;
  compare_returns?: ThemeCompareReturnsV0 | null;
};

export type CompareGroupsV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  columns?: string[];
  rows: CompareGroupsRowV0[];
};
