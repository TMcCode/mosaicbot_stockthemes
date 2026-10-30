import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type {
  StockEarningsTableStatsV0,
  StockThemeMembershipAppV0,
  StockTickerEarningsV0,
} from "@/types/stock.detail.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/**
 * Weight-normalized blend of membership themes (ETL).
 * ``compare_returns`` = point-in-time heatmap row; ``chart`` = indexed time series.
 */
export type StockThemeIndexV0 = {
  weights_basis?: string;
  note?: string;
  compare_returns?: ThemeCompareReturnsV0;
  chart?: ChartPerformanceV0;
};

/**
 * Tier B sidecar: stocks/<TICKER>.app.v0.json
 * Private R2 stockthemes_app/; browsers use /cdn-app.
 * See MosaicBot docs/stockthemes/PUBLIC_VS_PROTECTED_DATA.md
 */
export type StockAppV0 = {
  schema_version: "stock.app.v0";
  ticker: string;
  name?: string;
  as_of?: string;
  build_id?: string;
  ticker_performance_as_of?: string;
  /** Prefer weight descending from ETL; UI re-sorts if needed. */
  themes: StockThemeMembershipAppV0[];
  theme_heatmap_columns?: string[];
  /** Membership-weighted theme exposure index (heatmap + chart). */
  theme_index?: StockThemeIndexV0;
  /** This ticker’s earnings schedule + moves for the inverse Earnings Returns top row. */
  earnings?: StockTickerEarningsV0;
  /** Weighted / average / median of membership theme earnings returns. */
  earnings_table_stats?: StockEarningsTableStatsV0;
};

export const STOCK_APP_SIDECAR_SUFFIX = ".app.v0.json";
