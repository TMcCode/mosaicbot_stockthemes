import {
  THEME_APP_SIDECAR_SUFFIX,
  type ThemeAppV0,
} from "@/types/theme.app.v0";
import type { ThemeDetailConstituentV0, ThemeDetailV0 } from "@/types/theme.detail.v0";

export function themeAppSidecarRel(slug: string): string {
  return `themes/${slug}${THEME_APP_SIDECAR_SUFFIX}`;
}

export function themeAppSidecarUrl(base: string, slug: string): string {
  const root = base.replace(/\/$/, "");
  return `${root}/themes/${encodeURIComponent(slug)}${THEME_APP_SIDECAR_SUFFIX}`;
}

export function parseThemeAppPayload(data: unknown): ThemeAppV0 | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.schema_version !== "theme.app.v0") return null;
  if (typeof obj.slug !== "string" || !obj.slug.trim()) return null;
  if (!Array.isArray(obj.constituents)) return null;
  return data as ThemeAppV0;
}

function mergeConstituent(
  base: ThemeDetailConstituentV0,
  extra: ThemeDetailConstituentV0 | undefined,
): ThemeDetailConstituentV0 {
  if (!extra) return base;
  return {
    ...base,
    ...extra,
    ticker: base.ticker || extra.ticker,
    name: base.name ?? extra.name,
    logo_url: base.logo_url ?? extra.logo_url,
  };
}

/**
 * Overlay Tier B app sidecar onto public (possibly slim) theme detail.
 * Safe when app is null or when public is still the fat legacy payload.
 */
export function mergeThemeDetailWithApp(
  publicDetail: ThemeDetailV0,
  app: ThemeAppV0 | null | undefined,
): ThemeDetailV0 {
  if (!app) return publicDetail;

  const byTicker = new Map<string, ThemeDetailConstituentV0>();
  for (const c of app.constituents) {
    const t = String(c.ticker || "")
      .trim()
      .toUpperCase();
    if (t) byTicker.set(t, c);
  }

  const seen = new Set<string>();
  const constituents: ThemeDetailConstituentV0[] = [];
  for (const c of publicDetail.constituents) {
    const t = String(c.ticker || "")
      .trim()
      .toUpperCase();
    seen.add(t);
    constituents.push(mergeConstituent(c, t ? byTicker.get(t) : undefined));
  }
  for (const [t, c] of byTicker) {
    if (!seen.has(t)) constituents.push(c);
  }

  return {
    ...publicDetail,
    ticker_performance_as_of:
      app.ticker_performance_as_of ?? publicDetail.ticker_performance_as_of,
    has_ticker_notes:
      app.has_ticker_notes === true ? true : publicDetail.has_ticker_notes,
    chart_1y: app.chart_1y ?? publicDetail.chart_1y,
    compare_returns: app.compare_returns ?? publicDetail.compare_returns,
    rank_10d: app.rank_10d ?? publicDetail.rank_10d,
    constituent_table_stats:
      app.constituent_table_stats ?? publicDetail.constituent_table_stats,
    constituents,
  };
}
