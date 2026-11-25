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
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";

export function stockAppSidecarRel(ticker: string): string {
  return `stocks/${ticker}${STOCK_APP_SIDECAR_SUFFIX}`;
}

/** Same-origin Pages Function — private R2 Tier B. */
export function stockAppBrowserPath(ticker: string): string {
  return `/cdn-app/stocks/${encodeURIComponent(ticker)}${STOCK_APP_SIDECAR_SUFFIX}`;
}

const STOCK_APP_TTL_MS = 60_000;
const stockAppInflight = new Map<string, Promise<StockAppV0 | null>>();
const stockAppResolved = new Map<string, { at: number; app: StockAppV0 | null }>();

function stockAppCacheKey(ticker: string): string {
  return String(ticker || "").trim();
}

/**
 * Shared browser fetch for `stocks/<T>.app.v0.json`.
 * Dedupes in-flight + short TTL so chips / treemap / lens / chart share one request
 * (dev cache-buster is per-call `Date.now()`, so without this each mount hits the network).
 */
export function fetchStockAppBrowser(ticker: string): Promise<StockAppV0 | null> {
  const key = stockAppCacheKey(ticker);
  if (!key) return Promise.resolve(null);

  const cached = stockAppResolved.get(key);
  if (cached && Date.now() - cached.at < STOCK_APP_TTL_MS) {
    return Promise.resolve(cached.app);
  }

  const pending = stockAppInflight.get(key);
  if (pending) return pending;

  const q = stockthemesBrowserCacheBusterQuery();
  const url = `${stockAppBrowserPath(key)}${q ? `?${q}` : ""}`;
  const req = (async () => {
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
      });
      if (!res.ok) return null;
      return parseStockAppPayload(await res.json());
    } catch {
      return null;
    } finally {
      stockAppInflight.delete(key);
    }
  })().then((app) => {
    // Only cache hits — a transient 403/network miss must not blank the map for 60s.
    if (app) stockAppResolved.set(key, { at: Date.now(), app });
    return app;
  });

  stockAppInflight.set(key, req);
  return req;
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
