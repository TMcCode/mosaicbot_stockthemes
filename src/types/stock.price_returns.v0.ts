import type {
  ConstituentPriceReturnsV0,
  ThemeCompareReturnsV0,
} from "@/types/theme.detail.v0";

/**
 * Tier B hot path: stocks/<TICKER>.price_returns.v0.json
 * Patched on price-only publishes (digest skip).
 */
export type StockPriceReturnsSidecarV0 = {
  schema_version: "stock.price_returns.v0";
  ticker: string;
  name?: string;
  as_of: string;
  ticker_performance_as_of?: string;
  build_id?: string;
  price_returns: ConstituentPriceReturnsV0;
  compare_returns?: ThemeCompareReturnsV0;
};

export const STOCK_PRICE_RETURNS_SIDECAR_SUFFIX = ".price_returns.v0.json";
