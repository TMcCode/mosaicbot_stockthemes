/** Public inflection hunt list — relative 10D−YTD ranks for TimBot Tuesday. */
export type InflectionHuntRowV0 = {
  slug: string;
  name: string;
  group_slug?: string;
  ret_10d: number;
  ret_ytd: number;
  spread_10d_ytd: number;
  /** 1 = most positive spread in universe. */
  universe_rank_spread: number;
  universe_total: number;
  accel_ly_cy_ny?: string[];
  accel_cy_ny_n2y?: string[];
  /** True when at least one ticker is on both accel chains. */
  accel_dual?: boolean;
  accel_dual_tickers?: string[];
};

export type InflectionHuntV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  universe_total: number;
  long_n: number;
  short_n: number;
  longs: InflectionHuntRowV0[];
  shorts: InflectionHuntRowV0[];
};
