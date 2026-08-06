export type ThemeQualityRiskQuarterSlotV0 =
  | "q_minus_4"
  | "q_minus_3"
  | "q_minus_2"
  | "q_minus_1"
  | "lq";
export type ThemeQualityRiskFiscalSlotV0 = "l3y" | "l2y" | "ly" | "cy" | "ny" | "n2y";
export type ThemeQualityRiskModeV0 = "quarterly" | "fiscal_ebitda" | "risk";
export type ThemeQualityRiskColumnLabelsV0 = {
  quarterly?: Partial<Record<ThemeQualityRiskQuarterSlotV0 | "ttm", string>>;
  fiscal_ebitda?: Partial<Record<ThemeQualityRiskFiscalSlotV0, string>>;
};

/** A strictly reported fiscal quarter; percentages are percent points (12.3 = 12.3%). */
export type ThemeQualityRiskReportedQuarterV0 = {
  period_end?: string | null;
  gross_pct?: number | null;
  ebitda_pct?: number | null;
};

/** TTM margins calculated only from the four reported quarters represented in this payload. */
export type ThemeQualityRiskTtmV0 = {
  period_end?: string | null;
  gross_pct?: number | null;
  ebitda_pct?: number | null;
};

export type ThemeQualityRiskQuarterlyV0 = Partial<
  Record<ThemeQualityRiskQuarterSlotV0, ThemeQualityRiskReportedQuarterV0>
> & {
  ttm?: ThemeQualityRiskTtmV0;
};

export type ThemeQualityRiskFiscalEbitdaPeriodV0 = {
  /** Backward-compatible alias for EBITDA margin. */
  pct?: number | null;
  gross_pct?: number | null;
  ebitda_pct?: number | null;
  kind?: "actual" | "estimate" | null;
  period_end?: string | null;
};

export type ThemeQualityRiskFiscalEbitdaV0 = Partial<
  Record<ThemeQualityRiskFiscalSlotV0, ThemeQualityRiskFiscalEbitdaPeriodV0>
>;

export type ThemeQualityRiskRiskV0 = {
  /** (R&D + CapEx) / TTM revenue, in percent points. */
  invest_pct?: number | null;
  /** TTM free cash flow / TTM EBITDA, in percent points. */
  fcf_to_ebitda_pct?: number | null;
  /** TTM operating cash flow / TTM net income, expressed as a multiple. */
  cfo_to_net_income?: number | null;
  /** TTM change in working capital / TTM revenue, in percent points. */
  working_capital_drag_pct?: number | null;
  /** TTM stock-based compensation / TTM revenue, in percent points. */
  stock_comp_pct?: number | null;
  /** Net debt / TTM EBITDA, expressed as a multiple. */
  debt_to_ebitda?: number | null;
  /** TTM operating income / absolute TTM interest expense, expressed as a multiple. */
  interest_coverage?: number | null;
  /** Latest current assets / current liabilities, expressed as a multiple. */
  current_ratio?: number | null;
  /** Latest net debt change versus the same quarter one year earlier. */
  net_debt_yoy_pct?: number | null;
  /** Latest diluted share count change versus the same quarter one year earlier. */
  diluted_shares_yoy_pct?: number | null;
  /** Current FMP Altman Z-Score. */
  altman_z_score?: number | null;
  /** Current FMP Piotroski score, normally an integer from 0 through 9. */
  piotroski_score?: number | null;
  /** Current beta reported by the FMP company profile. */
  beta?: number | null;
  short_float_pct?: number | null;
  /**
   * Theme UI "Non-float %": closely held / non-free-float share of outstanding
   * (percent points). Prefer FMP ``100 − freeFloat``; may fall back to legacy
   * EOD insider % until non-float is populated.
   */
  inside_ownership_pct?: number | null;
};

export type ThemeQualityRiskMetricsV0 = {
  quarterly?: ThemeQualityRiskQuarterlyV0;
  fiscal_ebitda?: ThemeQualityRiskFiscalEbitdaV0;
  risk?: ThemeQualityRiskRiskV0;
};

export type ThemeQualityRiskConstituentV0 = ThemeQualityRiskMetricsV0 & {
  ticker: string;
  weight?: number | null;
};

export type ThemeQualityRiskStatRowV0 = Partial<Record<string, number | null>>;
export type ThemeQualityRiskTableStatsBlockV0 = {
  average?: ThemeQualityRiskStatRowV0;
  median?: ThemeQualityRiskStatRowV0;
  std_dev?: ThemeQualityRiskStatRowV0;
  min?: ThemeQualityRiskStatRowV0;
  max?: ThemeQualityRiskStatRowV0;
  positive_tickers_pct?: ThemeQualityRiskStatRowV0;
};

/**
 * Canonical sidecar contract: themes/<slug>.quality_risk.v0.json.
 * Parsers also accept likely aliases/nested metric blocks but always return this shape.
 */
export type ThemeQualityRiskV0 = {
  schema_version: 0;
  slug: string;
  theme?: string;
  as_of?: string;
  column_labels?: ThemeQualityRiskColumnLabelsV0;
  summary?: ThemeQualityRiskMetricsV0;
  table_stats?: Partial<Record<ThemeQualityRiskModeV0, ThemeQualityRiskTableStatsBlockV0>>;
  constituents: ThemeQualityRiskConstituentV0[];
};
