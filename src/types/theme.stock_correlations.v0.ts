export type ThemeStockCorrelationsV0 = {
  schema_version: "theme.stock_correlations.v0";
  slug: string;
  theme?: string;
  as_of?: string;
  window: string;
  max_tickers: number;
  tickers: Array<{ ticker: string; weight?: number }>;
  matrix: Array<Array<number | null>>;
};
