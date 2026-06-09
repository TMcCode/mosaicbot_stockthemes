import type { ChartPerformanceV0 } from "@/types/chart.v0";

export type ChartPerformanceEntityType = "theme" | "group" | "ticker";

export type ChartPerformanceSidecarV0 = {
  schema_version: "chart_performance.v0";
  slug: string;
  name: string;
  entity_type: ChartPerformanceEntityType;
  as_of: string;
  build_id?: string;
  max_window?: string;
  performance: ChartPerformanceV0;
};
