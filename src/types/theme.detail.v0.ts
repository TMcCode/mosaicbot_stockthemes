import type { ThemeChart1yV0 } from "@/types/chart.v0";

/** Per-ticker price returns from ticker_performance_latest.parquet (manifest ETL). */
export type ConstituentPriceReturnsV0 = {
  source?: string;
  metrics?: Record<string, number | null>;
  columns?: string[];
};

/** Precomputed Theme Compare row (intraday parquet → manifest ETL). */
export type ThemeCompareReturnsV0 = {
  source?: string;
  metrics?: Record<string, number | null>;
  columns?: string[];
  /** Set by ETL or client when short-theme metrics were sign-flipped for display. */
  short_display_inverted?: boolean;
  /**
   * Set when Premarket/1D/Postmarket/10D are in short-display PnL (aligned with short_display_inverted).
   * Legacy CDN omitted this after constituent overrides left those keys long.
   */
  short_constituent_horizons_inverted?: boolean;
};

/** 10D rank vs all themes and within group (manifest ETL → themes/<slug>.json). */
export type ThemeRank10dV0 = {
  period?: "10D" | string;
  return_pct?: number;
  universe_rank?: number;
  universe_total?: number;
  group_rank?: number | null;
  group_total?: number | null;
};

/**
 * Mirrors docs/stockthemes/schemas/theme.detail.v0.schema.json in MosaicBot.
 */
/** Theme_BullBearDetails surfaced for the public theme page (optional). */
export type ThemeThesisV0 = {
  thesis?: string;
  thesis_update?: string;
  bull_case?: string[];
  bear_case?: string[];
};

export type ThemeDetailConstituentV0 = {
  ticker: string;
  name?: string;
  weight?: number;
  market_cap_usd?: number;
  market_cap?: number;
  current_market_cap_usd?: number;
  current_market_cap?: number;
  marketCapUsd?: number;
  marketCap?: number;
  last_report_date?: string;
  next_report_date?: string;
  last_before_after_market?: string;
  next_before_after_market?: string;
  last_rpt_percent?: number;
  since_last_rpt_percent?: number;
  pre_earnings_percent_last_report?: number;
  earnings_percent_last_report?: number;
  pre_earnings_percent_prev_report?: number;
  earnings_percent_prev_report?: number;
  last_rpt_live_percent?: number;
  last_rpt_final_percent?: number;
  last_rpt_is_final?: boolean;
  price_returns?: ConstituentPriceReturnsV0;
  [key: string]: unknown;
};

export type ThemeDetailConstituentTableStatsV0 = {
  source?: string;
  average?: Record<string, number | null>;
  std_dev?: Record<string, number | null>;
  positive_tickers_pct?: Record<string, number | null>;
  median?: Record<string, number | null>;
  min?: Record<string, number | null>;
  max?: Record<string, number | null>;
};

export type ThemeDetailV0 = {
  schema_version: 0;
  slug: string;
  name: string;
  group_slug?: string | null;
  as_of: string;
  build_id?: string;
  ticker_count?: number;
  created_at?: string;
  updated_at?: string;
  /** ISO 8601 UTC when intraday ETL last wrote ticker_performance_latest.parquet. */
  ticker_performance_as_of?: string;
  seo_intro?: string;
  theme_thesis?: ThemeThesisV0;
  constituent_table_stats?: ThemeDetailConstituentTableStatsV0;
  constituents: ThemeDetailConstituentV0[];
  chart_1y?: ThemeChart1yV0;
  compare_returns?: ThemeCompareReturnsV0;
  rank_10d?: ThemeRank10dV0;
};
