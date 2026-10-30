import type {
  ThemeQualityRiskColumnLabelsV0,
  ThemeQualityRiskMetricsV0,
  ThemeQualityRiskModeV0,
} from "@/types/theme.quality_risk.v0";

export type StockQualityRiskThemeRowV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
  group_name?: string | null;
  weight?: number | null;
  /** Theme-weighted summary (quarterly / fiscal_ebitda / risk). */
  metrics?: ThemeQualityRiskMetricsV0;
};

export type StockQualityRiskTableStatsRowV0 = Partial<Record<string, number | null>> & {
  weight?: number | null;
};

export type StockQualityRiskModeStatsV0 = {
  weighted?: StockQualityRiskTableStatsRowV0;
  average?: StockQualityRiskTableStatsRowV0;
  median?: StockQualityRiskTableStatsRowV0;
};

/**
 * Tier B ``stocks/<TICKER>.quality_risk.v0.json`` — lazy after sign-in.
 * Modes on stock page: quarterly / fiscal_ebitda / risk only.
 */
export type StockQualityRiskV0 = {
  schema_version: "stock.quality_risk.v0" | string;
  ticker: string;
  name?: string;
  as_of: string;
  aggregation?: string;
  note?: string;
  column_labels?: ThemeQualityRiskColumnLabelsV0;
  ticker_metrics?: ThemeQualityRiskMetricsV0;
  themes: StockQualityRiskThemeRowV0[];
  table_stats?: Partial<Record<ThemeQualityRiskModeV0, StockQualityRiskModeStatsV0>>;
};
