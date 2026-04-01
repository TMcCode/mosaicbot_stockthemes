import type { ThemeChart1yV0 } from "@/types/chart.v0";

/**
 * Mirrors docs/stockthemes/schemas/theme.detail.v0.schema.json in MosaicBot.
 */
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
  [key: string]: unknown;
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
  seo_intro?: string;
  constituents: ThemeDetailConstituentV0[];
  chart_1y?: ThemeChart1yV0;
};
