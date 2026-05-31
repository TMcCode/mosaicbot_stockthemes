export const FACTOR_TOOLTIP_SUMMARIES: Record<string, string> = {
  MARKET:
    "Shows how much this theme tends to move with the overall stock market. Higher means it usually rises and falls with the broad market.",
  MOMENTUM:
    "Shows whether this theme behaves like recent winners. Higher means it tends to follow stocks that have had strong recent trends.",
  SMALL_CAP:
    "Shows how much this theme acts like smaller-company stocks versus large, established companies. Higher means more small-cap style behavior.",
  GROWTH_DURATION:
    "Shows growth-style sensitivity. Higher means this theme tends to move more like growth names that are valued more on future earnings.",
  VALUE_CYCLICAL:
    "Shows value and cyclical tilt. Higher means this theme behaves more like traditional value or economy-sensitive stocks.",
  QUALITY_DEFENSIVE:
    "Shows quality and defensiveness. Higher means this theme tends to act more like steadier, profitable, lower-volatility companies.",
  SPECULATIVE_BETA:
    "Shows risk-on, high-volatility behavior. Higher means this theme tends to move more like aggressive speculative names.",
  FALLING_RATE:
    "Shows sensitivity to falling-rate environments. Higher means this theme has historically done better when long-term yields were falling.",
  CREDIT_RISK_ON:
    "Shows credit risk-on sensitivity. Higher means this theme tends to do better when investors are more comfortable taking credit risk.",
  INFLATION_COMMODITY:
    "Shows inflation and commodity sensitivity. Higher means this theme tends to align more with commodity- and inflation-friendly periods.",
  STRONG_DOLLAR:
    "Shows dollar sensitivity. Higher means this theme has tended to perform better when the U.S. dollar is strengthening.",
  AI_INNOVATION:
    "Shows AI and innovation narrative sensitivity. Higher means this theme tends to move more with AI/innovation-driven market stories.",
  CRYPTO:
    "Shows crypto-linked sensitivity. Higher means this theme has tended to move more with crypto risk appetite.",
  MEME_RETAIL:
    "Shows retail-speculation behavior. Higher means this theme has tended to move more like hype-driven, high-volatility retail trades.",
  MEME_SENSITIVITY:
    "Shows meme-stock sensitivity. Higher means this theme has tended to move more with the Roundhill Meme Stock ETF (MEME) versus the broad market.",
  OIL_SENSITIVITY:
    "Shows crude-oil price sensitivity. Higher means this theme has tended to move more with the United States Oil Fund (USO) versus the broad market.",
  UNPROFITABLE_GROWTH:
    "Shows unprofitable-growth tilt. Higher means this theme acts more like fast-growing but less-profitable story stocks.",
};

export function factorTooltipSummaryForId(factorId?: string): string | null {
  if (!factorId) return null;
  return FACTOR_TOOLTIP_SUMMARIES[factorId] ?? null;
}

