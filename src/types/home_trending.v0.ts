import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type HomeTrendingRowV0 = {
  slug?: string | null;
  name: string;
  chart_1y?: ThemeChart1yV0 | null;
  compare_returns?: ThemeCompareReturnsV0 | null;
};

export type HomeTrendingV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  rows: HomeTrendingRowV0[];
};
