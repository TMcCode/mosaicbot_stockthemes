import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";
import type { ChartPerformanceV0 } from "@/types/chart.v0";

export type EtfBenchmarkRowV0 = {
  ticker: string;
  name: string;
  compare_returns?: ThemeCompareReturnsV0 | null;
  /** Indexed ~1Y series for overlay chart (sector SPDRs). */
  performance?: ChartPerformanceV0;
};

export type EtfBenchmarksV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  columns?: string[];
  source?: string;
  rows: EtfBenchmarkRowV0[];
};
