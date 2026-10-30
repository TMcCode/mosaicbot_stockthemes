import type {
  ThemeRevenueMetricMapV0,
  ThemeRevenueRevisionsV0,
} from "@/types/theme.revenue.v0";

/** CQ / CY / NY Rev Δ keys used for transposed "% Positive Tickers". */
export type StockRevisionPosDeltaKey =
  | "growth_delta_bps"
  | "cy_growth_delta_bps"
  | "ny_growth_delta_bps";

/** One membership theme’s revenue summary on the stock Revenue / Rev Revisions tabs. */
export type StockRevenueThemeRowV0 = {
  slug: string;
  name: string;
  group_slug?: string | null;
  group_name?: string | null;
  weight?: number | null;
  /** Theme manual-weight summary (growth + accel + valuation keys). */
  metrics?: ThemeRevenueMetricMapV0;
  /** Theme manual-weight ``summary_revisions``. */
  revisions?: ThemeRevenueRevisionsV0;
  /**
   * Theme ``table_stats.revisions.positive_tickers_pct`` for CQ/CY/NY Rev Δ only
   * (transposed onto stock Rev Revisions columns).
   */
  positive_tickers_pct?: Partial<Record<StockRevisionPosDeltaKey, number | null>>;
};

export type StockRevenueTableStatsRowV0 = Partial<Record<string, number | null>> & {
  weight?: number | null;
};

export type StockRevenueTableStatsV0 = {
  weighted?: StockRevenueTableStatsRowV0;
  average?: StockRevenueTableStatsRowV0;
  median?: StockRevenueTableStatsRowV0;
};

/**
 * Tier B ``stocks/<TICKER>.revenue.v0.json`` — lazy-fetched after sign-in.
 * Built by revenue publish from theme revenue sidecars (not price-only).
 * Powers both Revenue (Growth/Accel/Valuation) and Rev Revisions tabs.
 */
export type StockRevenueV0 = {
  schema_version: "stock.revenue.v0" | string;
  ticker: string;
  name?: string;
  as_of: string;
  aggregation?: string;
  note?: string;
  /** This ticker’s growth + accel + valuation metrics. */
  ticker_metrics?: ThemeRevenueMetricMapV0;
  /** This ticker’s revision metrics (constituent row). */
  ticker_revisions?: ThemeRevenueRevisionsV0;
  themes: StockRevenueThemeRowV0[];
  table_stats?: StockRevenueTableStatsV0;
  /** Membership blends of theme ``revisions`` + ``pos_*`` % Positive Δ keys. */
  revisions_table_stats?: StockRevenueTableStatsV0;
};
