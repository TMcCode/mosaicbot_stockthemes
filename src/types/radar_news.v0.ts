/** Baked Narrative Radar "In the News" (`radar_news.v0.json` on stockthemes-public). */

import type { HomeRadarTickerPreviewV0 } from "@/types/home_radar.v0";

export type RadarNewsHeadlineV0 = {
  title: string;
  url: string;
  published_at: string;
  source_name?: string | null;
  snippet?: string | null;
  pub_list_hit?: boolean;
};

export type RadarNewsCardV0 = {
  slug: string;
  name: string;
  group_name?: string | null;
  group_slug?: string | null;
  year_suffix?: number | null;
  return_1m?: number | null;
  hits_14d: number;
  latest_at?: string | null;
  score?: number;
  trending_boost?: boolean;
  /** Master-pub top story was pinned onto this theme card. */
  top_story?: boolean;
  headlines: RadarNewsHeadlineV0[];
  tickers_preview: HomeRadarTickerPreviewV0[];
  tickers_preview_more?: number | null;
};

export type RadarNewsDayV0 = {
  as_of: string;
  fetched_at?: string;
  home: RadarNewsCardV0[];
  all: RadarNewsCardV0[];
};

export type RadarNewsV0 = {
  schema_version: 0;
  as_of: string;
  fetched_at?: string;
  hits_window_days?: number;
  history_days?: number;
  home_limit?: number;
  all_limit?: number;
  today: RadarNewsDayV0;
  history?: RadarNewsDayV0[];
  meta?: Record<string, unknown>;
};
