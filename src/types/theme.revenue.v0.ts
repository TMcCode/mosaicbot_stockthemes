export type ThemeRevenueMetricMapV0 = {
  n2q_rev_est_pct?: number | null;
  nq_rev_est_pct?: number | null;
  cq_rev_est_pct?: number | null;
  lq_rev_act_pct?: number | null;
  l2q_rev_act_pct?: number | null;
  l3q_rev_act_pct?: number | null;
  l4q_rev_act_pct?: number | null;
  l5q_rev_act_pct?: number | null;
  lq_py_rev_act_pct?: number | null;
  cq_py_rev_act_pct?: number | null;
  nq_py_rev_act_pct?: number | null;
  l2y_rev_act_pct?: number | null;
  ly_rev_act_pct?: number | null;
  cy_rev_est_pct?: number | null;
  ny_rev_est_pct?: number | null;
  n2y_rev_est_pct?: number | null;
  trail_3y_cagr_pct?: number | null;
  fwd_3y_cagr_pct?: number | null;
  nq_accel_pp?: number | null;
  cq_accel_pp?: number | null;
  ly_cy_accel_pp?: number | null;
  cy_ny_accel_pp?: number | null;
  ny_n2y_accel_pp?: number | null;
  ps_ratio_ntm?: number | null;
  ps_to_revgrowth?: number | null;
  ps_ratio_ny?: number | null;
  psg_ny?: number | null;
  ps_ratio_n2y?: number | null;
  psg_n2y?: number | null;
};

export type ThemeRevenueRevisionsV0 = {
  growth_est_latest_pct?: number | null;
  growth_est_first_pct?: number | null;
  growth_delta_bps?: number | null;
  growth_est_low_pct?: number | null;
  growth_est_high_pct?: number | null;
  revenue_est_analysts?: number | null;
};

export type ThemeRevenueConstituentV0 = {
  ticker: string;
  weight?: number | null;
  growth: ThemeRevenueMetricMapV0;
  accel: ThemeRevenueMetricMapV0;
  revisions?: ThemeRevenueRevisionsV0;
};

export type ThemeRevenueStatRowV0 = Partial<Record<string, number | null>>;

export type ThemeRevenueTableStatsBlockV0 = {
  average?: ThemeRevenueStatRowV0;
  median?: ThemeRevenueStatRowV0;
  std_dev?: ThemeRevenueStatRowV0;
  min?: ThemeRevenueStatRowV0;
  max?: ThemeRevenueStatRowV0;
  positive_tickers_pct?: ThemeRevenueStatRowV0;
};

export type ThemeRevenueTableStatsV0 = {
  growth?: ThemeRevenueTableStatsBlockV0;
  accel?: ThemeRevenueTableStatsBlockV0;
  revisions?: ThemeRevenueTableStatsBlockV0;
};

export type ThemeRevenueAcceleratingV0 = {
  ly_cy_ny?: string[];
  cy_ny_n2y?: string[];
};

export type ThemeRevenueV0 = {
  schema_version: 0;
  slug: string;
  theme?: string;
  as_of: string;
  aggregation: string;
  summary: ThemeRevenueMetricMapV0;
  summary_revisions?: ThemeRevenueRevisionsV0;
  accelerating?: ThemeRevenueAcceleratingV0;
  table_stats?: ThemeRevenueTableStatsV0;
  constituents: ThemeRevenueConstituentV0[];
};
