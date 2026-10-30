import type {
  ConstituentPriceReturnsV0,
  ThemeCompareReturnsV0,
} from "@/types/theme.detail.v0";

/**
 * Mirrors MosaicBot docs/stockthemes/schemas/stock.detail.v0.schema.json
 * Public Tier A: stocks/<TICKER>.json
 */
export type StockThemeMembershipPublicV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
  group_name?: string | null;
};

export type StockDetailV0 = {
  schema_version: 0;
  ticker: string;
  name?: string;
  as_of: string;
  build_id?: string;
  ticker_performance_as_of?: string;
  logo_url?: string | null;
  seo_intro?: string;
  theme_count?: number;
  /** Member themes without weights. */
  themes: StockThemeMembershipPublicV0[];
};

/**
 * Theme-level earnings aggregates for the stock-page inverse Earnings Returns table.
 * ``theme_return`` = ThemeWgt mean of available constituent cells; ``reported_tickers_pct``
 * = share of constituents with an effective current-quarter report (ET BMO/AMC rules).
 */
export type StockThemeEarningsReturnsV0 = {
  theme_return?: Partial<
    Record<
      | "last_quarter_earnings_move_pct"
      | "earnings_move_pct"
      | "intra_quarter_move_pct"
      | "since_last_report_pct"
      | "avg_abs_rpt_pct",
      number | null
    >
  >;
  positive_tickers_pct?: Partial<
    Record<
      | "last_quarter_earnings_move_pct"
      | "earnings_move_pct"
      | "intra_quarter_move_pct"
      | "since_last_report_pct"
      | "avg_abs_rpt_pct",
      number | null
    >
  >;
  reported_tickers_pct?: number | null;
  reported_count?: number;
  constituent_count?: number;
};

/** Tier B membership row (weights + theme returns for heatmap). */
export type StockThemeMembershipAppV0 = StockThemeMembershipPublicV0 & {
  weight?: number;
  compare_returns?: ThemeCompareReturnsV0;
  earnings_returns?: StockThemeEarningsReturnsV0;
};

/** Summary footer for stock-page Earnings Returns (ETL ``earnings_table_stats``). */
export type StockEarningsTableStatsV0 = {
  source?: string;
  weights_basis?: string;
  note?: string;
  weighted?: Record<string, number | null>;
  average?: Record<string, number | null>;
  median?: Record<string, number | null>;
};

/** Per-ticker earnings fields on ``stocks/<T>.app.v0.json`` (inverse table top row). */
export type StockTickerEarningsV0 = {
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
  avg_abs_rpt_percent?: number;
  last_rpt_live_percent?: number;
  last_rpt_final_percent?: number;
  last_rpt_is_final?: boolean;
};

export type { ConstituentPriceReturnsV0, ThemeCompareReturnsV0 };
