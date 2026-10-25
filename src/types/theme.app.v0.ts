import type {
  ThemeCompareReturnsV0,
  ThemeDetailConstituentTableStatsV0,
  ThemeDetailConstituentV0,
  ThemeRank10dV0,
} from "@/types/theme.detail.v0";
import type { ThemeChart1yV0 } from "@/types/chart.v0";

/**
 * Tier B sidecar: themes/<slug>.app.v0.json
 * Merged into slim public theme detail for charts / weights / metrics.
 * See MosaicBot docs/stockthemes/PUBLIC_VS_PROTECTED_DATA.md
 */
export type ThemeAppV0 = {
  schema_version: "theme.app.v0";
  slug: string;
  name?: string;
  as_of?: string;
  build_id?: string;
  has_ticker_notes?: boolean;
  ticker_performance_as_of?: string;
  chart_1y?: ThemeChart1yV0;
  compare_returns?: ThemeCompareReturnsV0;
  rank_10d?: ThemeRank10dV0;
  constituent_table_stats?: ThemeDetailConstituentTableStatsV0;
  constituents: ThemeDetailConstituentV0[];
};

export const THEME_APP_SIDECAR_SUFFIX = ".app.v0.json";
