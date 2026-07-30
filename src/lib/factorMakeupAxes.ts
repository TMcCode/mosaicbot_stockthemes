/** Radar axes for Factor makeup — co-movement vs ETF spreads (excludes Market, Value, Strong-Dollar, ARKK factors). */
export const FACTOR_MAKEUP_AXIS_IDS = [
  "MOMENTUM",
  "SMALL_CAP",
  "GROWTH_DURATION",
  "QUALITY_DEFENSIVE",
  "SPECULATIVE_BETA",
  "FALLING_RATE",
  "CREDIT_RISK_ON",
  "INFLATION_COMMODITY",
  "AI_INNOVATION",
  "CRYPTO",
  "MEME_SENSITIVITY",
  "OIL_SENSITIVITY",
] as const;

export type FactorMakeupAxisId = (typeof FACTOR_MAKEUP_AXIS_IDS)[number];

/** Compact labels for radar rim (full names via tooltips). */
export const FACTOR_MAKEUP_SHORT_LABELS: Record<FactorMakeupAxisId, string> = {
  MOMENTUM: "Momentum",
  SMALL_CAP: "Small-Cap",
  GROWTH_DURATION: "Growth",
  QUALITY_DEFENSIVE: "Quality",
  SPECULATIVE_BETA: "Spec. Beta",
  FALLING_RATE: "Falling Rates",
  CREDIT_RISK_ON: "Credit Risk-On",
  INFLATION_COMMODITY: "Inflation",
  AI_INNOVATION: "AI / Innovation",
  CRYPTO: "Crypto",
  MEME_SENSITIVITY: "Meme",
  OIL_SENSITIVITY: "Oil",
};

export const FACTOR_MAKEUP_DESKTOP_CAP = 8;
export const FACTOR_MAKEUP_MOBILE_CAP = 5;
