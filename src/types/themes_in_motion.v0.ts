import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/** Merged Themes in Motion (`themes_in_motion.v0.json`). */

export type ThemesInMotionRowV0 = {
  slug: string;
  name: string;
  group_name?: string | null;
  source?: "calc" | "manual" | "lock" | string;
  motion_score?: number | null;
  return_1d?: number | null;
  return_1m?: number | null;
  return_120d?: number | null;
  return_ytd?: number | null;
  revisions_z?: number | null;
  breadth_pct?: number | null;
  breadth_label?: string | null;
  revisions_label?: string | null;
  tickers_preview?: string[];
  tickers_preview_more?: number | null;
  thesis?: string | null;
  chart_1y?: ThemeChart1yV0 | null;
  compare_returns?: ThemeCompareReturnsV0 | null;
  locked_until?: string | null;
  homepage_slot?: number | null;
};

export type ThemesInMotionV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  calc_as_of?: string | null;
  homepage: ThemesInMotionRowV0[];
  pool: ThemesInMotionRowV0[];
};
