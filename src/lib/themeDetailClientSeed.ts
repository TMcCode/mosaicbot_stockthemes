import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeDetailConstituentV0, ThemeDetailV0 } from "@/types/theme.detail.v0";

/**
 * Strip Tier B fields (weights, returns, charts, table stats) so static HTML /
 * RSC Flight does not embed the numeric theme corpus. Client hydrates via `/cdn-app`.
 *
 * Equal-weight placeholders keep the hero treemap layout stable until live merge;
 * they are not proprietary basket weights.
 */
export function themeDetailPublicSeed(detail: ThemeDetailV0): ThemeDetailV0 {
  const constituents: ThemeDetailConstituentV0[] = (detail.constituents || []).map((c) => ({
    ticker: c.ticker,
    name: c.name,
    logo_url: c.logo_url,
    weight: 1,
  }));
  return {
    schema_version: detail.schema_version,
    slug: detail.slug,
    name: detail.name,
    group_slug: detail.group_slug,
    as_of: detail.as_of,
    build_id: detail.build_id,
    ticker_count: detail.ticker_count ?? constituents.length,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
    seo_intro: detail.seo_intro,
    has_ticker_notes: detail.has_ticker_notes,
    theme_thesis: detail.theme_thesis,
    // rank_10d already ships on public manifest rows — safe for hero meta.
    rank_10d: detail.rank_10d,
    constituents,
  };
}

/** Keep the live table/treemap seed while excluding large chart composition arrays from Flight. */
export function themeDetailLiveSeed(detail: ThemeDetailV0): ThemeDetailV0 {
  const seed = { ...detail };
  delete seed.chart_1y;
  return seed;
}

/** Embed the lightweight aggregate line; composition hydrates from the gated sidecar. */
export function themeChartPerformanceSeed(
  detail: ThemeDetailV0,
): ThemeChart1yV0 | undefined {
  const performance = detail.chart_1y?.performance;
  if (!performance?.dates?.length || !performance.values?.length) return undefined;
  return { performance };
}
