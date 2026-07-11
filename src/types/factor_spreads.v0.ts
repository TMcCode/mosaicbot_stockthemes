import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type FactorSpreadRowV0 = {
  factor_id: string;
  name: string;
  /** ETF proxy formula, e.g. ``AIQ − SPY``. */
  proxy?: string | null;
  compare_returns?: ThemeCompareReturnsV0 | null;
};

export type FactorSpreadsV0 = {
  schema_version: "factor_spreads.v0";
  as_of: string;
  generated_at?: string | null;
  columns?: string[];
  source?: string;
  rows: FactorSpreadRowV0[];
};
