import {
  STOCK_APP_SIDECAR_SUFFIX,
  type StockAppV0,
  type StockThemeIndexV0,
} from "@/types/stock.app.v0";
import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

export function stockAppSidecarRel(ticker: string): string {
  return `stocks/${ticker}${STOCK_APP_SIDECAR_SUFFIX}`;
}

/** Same-origin Pages Function — private R2 Tier B. */
export function stockAppBrowserPath(ticker: string): string {
  return `/cdn-app/stocks/${encodeURIComponent(ticker)}${STOCK_APP_SIDECAR_SUFFIX}`;
}

/**
 * Browser → gated `/cdn-app/...`.
 * Build/SSR disk cache still uses `stocks/<ticker>.app.v0.json` under the public data base.
 */
export function stockAppSidecarUrl(base: string, ticker: string): string {
  if (typeof window !== "undefined") {
    return stockAppBrowserPath(ticker);
  }
  const root = base.replace(/\/$/, "");
  return `${root}/stocks/${encodeURIComponent(ticker)}${STOCK_APP_SIDECAR_SUFFIX}`;
}

export function parseStockAppPayload(data: unknown): StockAppV0 | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.schema_version !== "stock.app.v0") return null;
  if (typeof obj.ticker !== "string" || !obj.ticker.trim()) return null;
  if (!Array.isArray(obj.themes)) return null;
  return data as StockAppV0;
}

function mergeThemeMembership(
  base: StockThemeMembershipPublicV0,
  extra: StockThemeMembershipAppV0 | undefined,
): StockThemeMembershipAppV0 {
  if (!extra) return { ...base };
  return {
    ...base,
    ...extra,
    slug: base.slug || extra.slug,
    name: base.name || extra.name,
    group_slug: base.group_slug ?? extra.group_slug,
    group_name: base.group_name ?? extra.group_name,
  };
}

/**
 * Overlay Tier B stock.app onto public stock detail (weights + heatmap metrics).
 */
export function mergeStockDetailWithApp(
  publicDetail: StockDetailV0,
  app: StockAppV0 | null | undefined,
): StockDetailV0 & {
  themes: StockThemeMembershipAppV0[];
  theme_heatmap_columns?: string[];
  theme_index?: StockThemeIndexV0;
} {
  if (!app) {
    return { ...publicDetail, themes: publicDetail.themes.map((t) => ({ ...t })) };
  }

  const bySlug = new Map<string, StockThemeMembershipAppV0>();
  for (const t of app.themes) {
    const s = String(t.slug || "").trim();
    if (s) bySlug.set(s, t);
  }

  const seen = new Set<string>();
  const themes: StockThemeMembershipAppV0[] = [];
  for (const t of publicDetail.themes) {
    const s = String(t.slug || "").trim();
    seen.add(s);
    themes.push(mergeThemeMembership(t, s ? bySlug.get(s) : undefined));
  }
  for (const [s, t] of bySlug) {
    if (!seen.has(s)) themes.push({ ...t });
  }

  themes.sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1));

  return {
    ...publicDetail,
    name: publicDetail.name ?? app.name,
    as_of: publicDetail.as_of || app.as_of || publicDetail.as_of,
    build_id: publicDetail.build_id ?? app.build_id,
    ticker_performance_as_of:
      publicDetail.ticker_performance_as_of ?? app.ticker_performance_as_of,
    theme_count: themes.length,
    themes,
    ...(app.theme_heatmap_columns?.length
      ? { theme_heatmap_columns: app.theme_heatmap_columns }
      : {}),
    ...(app.theme_index ? { theme_index: app.theme_index } : {}),
  };
}
