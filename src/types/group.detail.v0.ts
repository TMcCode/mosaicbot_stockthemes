import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

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
};
