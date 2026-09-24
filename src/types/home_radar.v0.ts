/** Precomputed Narrative Radar cards (`home_radar.v0.json`). */

/** Rich logo chip (ETL); legacy string tickers still accepted by the UI. */
export type HomeRadarTickerPreviewV0 =
  | string
  | {
      ticker: string;
      logo_url?: string | null;
      company_name?: string | null;
      name?: string | null;
    };

export type HomeRadarCardV0 = {
  slug: string;
  name: string;
  group_name?: string | null;
  thesis?: string | null;
  return_1m?: number | null;
  return_10d?: number | null;
  return_ytd?: number | null;
  /** Theme-weighted consensus forward revenue growth revision, percentage points. */
  rev_delta_pp?: number | null;
  /** CY (vendor 0y) growth revision, percentage points. */
  rev_cy_delta_pp?: number | null;
  /** NY (vendor +1y) growth revision, percentage points. */
  rev_ny_delta_pp?: number | null;
  signal_label?: string | null;
  tickers_preview?: HomeRadarTickerPreviewV0[];
  tickers_preview_more?: number | null;
  score?: number | null;
  created_at?: string | null;
  year_suffix?: number | null;
  /**
   * New tab only: ≥3 themes in the same group → one flipper card.
   * Full ordered member list (includes the lead / root fields).
   */
  siblings?: HomeRadarCardV0[];
};

export type HomeRadarTabV0 = {
  home: HomeRadarCardV0[];
  all: HomeRadarCardV0[];
};

export type HomeRadarV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  week_start?: string;
  week_end?: string;
  tabs: {
    new: HomeRadarTabV0;
    accelerating: HomeRadarTabV0;
    fading: HomeRadarTabV0;
  };
};
