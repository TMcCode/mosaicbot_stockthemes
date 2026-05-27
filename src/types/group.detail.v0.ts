import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0, ThemeRank10dV0 } from "@/types/theme.detail.v0";

export type GroupDetailThemeTreemapThemeV0 = {
  slug: string;
  name: string;
  /** Equal share (typically 1 / N). */
  weight: number;
  compare_returns?: ThemeCompareReturnsV0;
};

/** Baked on group JSON by manifest — equal-weight tiles, manual-weight theme returns. */
export type GroupDetailThemeTreemapV0 = {
  weighting: "equal";
  returns_basis?: string;
  source?: string;
  themes: GroupDetailThemeTreemapThemeV0[];
};

/**
 * Mirrors docs/stockthemes/schemas/group.detail.v0.schema.json in MosaicBot.
 */
export type GroupDetailChildThemeV0 = {
  slug: string;
  name: string;
  ticker_count?: number;
  group_slug?: string;
  /** Mean constituent USD market cap (theme ETL `constituent_table_stats.average`). */
  avg_market_cap_usd?: number;
  /** Sum of constituent USD market caps. */
  total_market_cap_usd?: number;
  /** Theme-level compare metrics (same columns as `/compare`). */
  compare_returns?: ThemeCompareReturnsV0;
  /** First few constituents (ETL); `tickers_preview_more` = additional count. */
  tickers_preview?: string[];
  tickers_preview_more?: number;
};

export type GroupDetailV0 = {
  schema_version: 0;
  slug: string;
  name: string;
  as_of: string;
  build_id?: string;
  theme_count?: number;
  ticker_count?: number;
  theme_slugs?: string[];
  seo_intro?: string;
  themes: GroupDetailChildThemeV0[];
  /** Group aggregate line + optional per-theme lines (`composition_indexed`, 2+ child themes). */
  chart_1y?: ThemeChart1yV0;
  /** Equal-weight theme market map (manual-weight compare_returns per theme). */
  theme_treemap?: GroupDetailThemeTreemapV0;
  /** 10D rank vs all groups (manifest ETL). */
  rank_10d?: ThemeRank10dV0;
};
