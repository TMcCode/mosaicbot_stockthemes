import type {
  ThemeCohesionHorizonV0,
  ThemeConstituentFitV0,
  ThemeFactorAttributionHorizon,
  ThemeFactorAttributionHorizonV0,
  ThemeFactorAttributionV0,
  ThemeFactorContributionV0,
} from "@/types/theme.factor_attribution.v0";

export const FACTOR_ATTRIBUTION_SIDECAR_SUFFIX = ".factor_attribution.v0.json";

export const FACTOR_ATTRIBUTION_HORIZON_ORDER: ThemeFactorAttributionHorizon[] = [
  "1M",
  "3M",
  "6M",
  "YTD",
  "1Y",
  "3Y",
  "5Y",
  "10Y",
];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function contribution(value: unknown): ThemeFactorContributionV0 | null {
  const row = record(value);
  const factorId = text(row.factor_id);
  const label = text(row.label) || factorId;
  const contributionPct = finite(row.contribution_pct);
  const factorReturnPct = finite(row.factor_return_pct);
  const averageBeta = finite(row.average_beta);
  if (!factorId || contributionPct == null || factorReturnPct == null || averageBeta == null) {
    return null;
  }
  const confidence = finite(row.confidence);
  return {
    factor_id: factorId,
    label,
    contribution_pct: contributionPct,
    factor_return_pct: factorReturnPct,
    average_beta: averageBeta,
    ...(confidence == null ? {} : { confidence }),
  };
}

function attributionHorizon(value: unknown): ThemeFactorAttributionHorizonV0 | null {
  const row = record(value);
  const actualReturnPct = finite(row.actual_return_pct);
  const explainedReturnPct = finite(row.explained_return_pct);
  const themeSpecificReturnPct = finite(row.theme_specific_return_pct);
  const coveragePct = finite(row.coverage_pct);
  const sampleSize = finite(row.sample_size);
  if (
    actualReturnPct == null ||
    explainedReturnPct == null ||
    themeSpecificReturnPct == null ||
    coveragePct == null ||
    sampleSize == null
  ) {
    return null;
  }
  const contributions = (Array.isArray(row.contributions) ? row.contributions : [])
    .map(contribution)
    .filter((item): item is ThemeFactorContributionV0 => item != null)
    .sort((a, b) => Math.abs(b.contribution_pct) - Math.abs(a.contribution_pct));
  const modelR2 = finite(row.model_r2);
  return {
    actual_return_pct: actualReturnPct,
    explained_return_pct: explainedReturnPct,
    theme_specific_return_pct: themeSpecificReturnPct,
    coverage_pct: coveragePct,
    sample_size: Math.max(0, Math.round(sampleSize)),
    contributions,
    ...(modelR2 == null ? {} : { model_r2: modelR2 }),
  };
}

function constituentFit(value: unknown): ThemeConstituentFitV0 | null {
  const row = record(value);
  const ticker = text(row.ticker).toUpperCase();
  const sampleSize = finite(row.sample_size);
  const coveragePct = finite(row.coverage_pct);
  if (!ticker || sampleSize == null || coveragePct == null) return null;
  const optional = {
    correlation_to_theme: finite(row.correlation_to_theme),
    market_adjusted_correlation: finite(row.market_adjusted_correlation),
    beta_to_theme: finite(row.beta_to_theme),
    theme_r2: finite(row.theme_r2),
    stock_specific_share: finite(row.stock_specific_share),
  };
  return {
    ticker,
    sample_size: Math.max(0, Math.round(sampleSize)),
    coverage_pct: coveragePct,
    ...Object.fromEntries(
      Object.entries(optional).filter((entry): entry is [string, number] => entry[1] != null),
    ),
  };
}

function cohesionHorizon(value: unknown): ThemeCohesionHorizonV0 | null {
  const row = record(value);
  const validConstituents = finite(row.valid_constituents);
  const coveragePct = finite(row.coverage_pct);
  if (validConstituents == null || coveragePct == null) return null;
  const constituents = (Array.isArray(row.constituents) ? row.constituents : [])
    .map(constituentFit)
    .filter((item): item is ThemeConstituentFitV0 => item != null);
  const optional = {
    median_correlation: finite(row.median_correlation),
    weighted_average_correlation: finite(row.weighted_average_correlation),
    market_adjusted_median_correlation: finite(row.market_adjusted_median_correlation),
    dispersion: finite(row.dispersion),
    pct_above_0_50: finite(row.pct_above_0_50),
    pct_negative: finite(row.pct_negative),
  };
  return {
    valid_constituents: Math.max(0, Math.round(validConstituents)),
    coverage_pct: coveragePct,
    constituents,
    ...Object.fromEntries(
      Object.entries(optional).filter((entry): entry is [string, number] => entry[1] != null),
    ),
  };
}

export function themeFactorAttributionUrl(dataBaseUrl: string, slug: string): string {
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${FACTOR_ATTRIBUTION_SIDECAR_SUFFIX}`;
}

export function parseThemeFactorAttribution(raw: string): ThemeFactorAttributionV0 {
  const source = record(JSON.parse(raw));
  if (source.schema_version !== "theme.factor_attribution.v0") {
    throw new Error(`Unsupported factor attribution schema: ${String(source.schema_version)}`);
  }
  const horizonsSource = record(source.horizons);
  const cohesionSource = record(source.cohesion);
  const horizons: ThemeFactorAttributionV0["horizons"] = {};
  const cohesion: ThemeFactorAttributionV0["cohesion"] = {};
  for (const key of FACTOR_ATTRIBUTION_HORIZON_ORDER) {
    const parsedHorizon = attributionHorizon(horizonsSource[key]);
    if (parsedHorizon) horizons[key] = parsedHorizon;
    const parsedCohesion = cohesionHorizon(cohesionSource[key]);
    if (parsedCohesion) cohesion[key] = parsedCohesion;
  }
  return {
    schema_version: "theme.factor_attribution.v0",
    slug: text(source.slug),
    as_of: text(source.as_of),
    methodology_version: text(source.methodology_version),
    history_method: "reconstructed_current_membership",
    horizons,
    cohesion,
  };
}

export function factorAttributionHasContent(data: ThemeFactorAttributionV0): boolean {
  return FACTOR_ATTRIBUTION_HORIZON_ORDER.some((key) => data.horizons[key] != null);
}

export function availableFactorAttributionHorizons(
  data: ThemeFactorAttributionV0,
): ThemeFactorAttributionHorizon[] {
  return FACTOR_ATTRIBUTION_HORIZON_ORDER.filter((key) => data.horizons[key] != null);
}

export function formatSignedPercent(value: number | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function formatDecimal(value: number | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}
