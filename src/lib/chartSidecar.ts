import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { publicAssetPath } from "@/lib/siteUrl";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
  priceReturnsBrowserCacheBusterQuery,
} from "@/lib/stockthemesCache";
import {
  stockthemesBrowserOverlayFixtures,
  stockthemesBrowserSidecarFetchBase,
  stockthemesPublicDataBase,
} from "@/lib/stockthemesPublicBase";
import type { ChartPerformanceSidecarV0 } from "@/types/chart_performance.v0";
import type { ChartPerformanceV0 } from "@/types/chart.v0";

export const CHART_SIDECAR_SUFFIX = ".chart.v0.json";

export type OverlayEntityKind = "theme" | "group" | "ticker";

export function overlayItemKey(kind: OverlayEntityKind, slug: string): string {
  return `${kind}:${slug.trim()}`;
}

export function parseOverlayItemKey(raw: string): { kind: OverlayEntityKind; slug: string } | null {
  const s = String(raw || "").trim();
  const idx = s.indexOf(":");
  if (idx <= 0) return null;
  const kind = s.slice(0, idx) as OverlayEntityKind;
  const slug = s.slice(idx + 1).trim();
  if ((kind !== "theme" && kind !== "group" && kind !== "ticker") || !slug) return null;
  return { kind, slug: kind === "ticker" ? slug.toUpperCase() : slug };
}

export function parseChartPerformanceSidecar(raw: string): ChartPerformanceSidecarV0 | null {
  try {
    const data = parseJsonPayload<ChartPerformanceSidecarV0>(raw);
    if (data.schema_version !== "chart_performance.v0") return null;
    if (!data.slug || !data.name || !data.performance?.dates?.length || !data.performance?.values?.length) {
      return null;
    }
    if (data.entity_type !== "theme" && data.entity_type !== "group" && data.entity_type !== "ticker") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function sidecarRelPath(kind: OverlayEntityKind, slug: string): string {
  const enc = encodeURIComponent(slug);
  if (kind === "ticker") {
    return `tickers/${enc}${CHART_SIDECAR_SUFFIX}`;
  }
  return kind === "theme" ? `themes/${enc}${CHART_SIDECAR_SUFFIX}` : `groups/${enc}${CHART_SIDECAR_SUFFIX}`;
}

function detailRelPath(kind: OverlayEntityKind, slug: string): string {
  const enc = encodeURIComponent(slug);
  return kind === "theme" ? `themes/${enc}.json` : `groups/${enc}.json`;
}

function performanceFromDetailJson(raw: string, kind: OverlayEntityKind, slug: string): ChartPerformanceSidecarV0 | null {
  if (kind === "ticker") return null;
  try {
    const data = parseJsonPayload<{ slug?: string; name?: string; chart_1y?: { performance?: ChartPerformanceV0 } }>(
      raw,
    );
    const perf = data.chart_1y?.performance;
    if (!perf?.dates?.length || !perf?.values?.length) return null;
    return {
      schema_version: "chart_performance.v0",
      slug: String(data.slug || slug).trim(),
      name: String(data.name || slug).trim(),
      entity_type: kind,
      as_of: "",
      max_window: "1y",
      performance: perf,
    };
  } catch {
    return null;
  }
}

const sidecarResultCache = new Map<string, ChartPerformanceSidecarV0 | null>();
const sidecarInflight = new Map<string, Promise<ChartPerformanceSidecarV0 | null>>();

/**
 * Live fetches skip the long-lived cache, but several components request the same sidecar
 * moments apart (chart performance poll, then composition live tail). Reuse a result for
 * this window so those become one request instead of one each.
 */
const LIVE_SIDECAR_TTL_MS = 60_000;
const liveSidecarCache = new Map<string, { at: number; value: ChartPerformanceSidecarV0 | null }>();

function liveSidecarCached(key: string): { value: ChartPerformanceSidecarV0 | null } | null {
  const hit = liveSidecarCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > LIVE_SIDECAR_TTL_MS) {
    liveSidecarCache.delete(key);
    return null;
  }
  return { value: hit.value };
}

async function fetchSidecarText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
      signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}

/** Fetch slim chart sidecar; fall back to chart_1y embedded in full detail JSON (themes/groups only). */
export async function fetchChartSidecar(
  kind: OverlayEntityKind,
  slug: string,
  signal?: AbortSignal,
  options?: { live?: boolean },
): Promise<ChartPerformanceSidecarV0 | null> {
  const normalizedSlug = kind === "ticker" ? slug.trim().toUpperCase() : slug.trim();
  const key = overlayItemKey(kind, normalizedSlug);
  const live = Boolean(options?.live);
  const cacheEnabled = process.env.NODE_ENV !== "development" && !live;
  if (cacheEnabled && sidecarResultCache.has(key)) return sidecarResultCache.get(key)!;

  const liveCacheEnabled = process.env.NODE_ENV !== "development" && live;
  if (liveCacheEnabled) {
    const hit = liveSidecarCached(key);
    if (hit) return hit.value;
  }

  const inflight = sidecarInflight.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const base = stockthemesPublicDataBase();
    const sidecarBase = stockthemesBrowserSidecarFetchBase();
    const useOverlayFixtures = stockthemesBrowserOverlayFixtures();
    const q = live ? priceReturnsBrowserCacheBusterQuery() : stockthemesBrowserCacheBusterQuery();
    const sidecarPath = sidecarRelPath(kind, normalizedSlug);

    const tryFixture = async (): Promise<ChartPerformanceSidecarV0 | null> => {
      const fixtureUrl = publicAssetPath(`/fixtures/${sidecarPath}`);
      const raw = await fetchSidecarText(fixtureUrl, signal);
      if (!raw) return null;
      return parseChartPerformanceSidecar(raw);
    };

    const tryCdnSidecar = async (): Promise<ChartPerformanceSidecarV0 | null> => {
      if (!sidecarBase) return null;
      const sidecarUrl = `${sidecarBase}/${sidecarPath}?${q}`;
      const raw = await fetchSidecarText(sidecarUrl, signal);
      if (!raw) return null;
      return parseChartPerformanceSidecar(raw);
    };

    // Tickers: live CDN first; fixtures only when offline or CDN miss.
    if (kind === "ticker") {
      const fromCdn = await tryCdnSidecar();
      if (fromCdn) return fromCdn;
      if (useOverlayFixtures || !base) {
        return await tryFixture();
      }
      return null;
    }

    // Full offline (no manifest URL): fixtures only.
    if (!base) {
      return await tryFixture();
    }

    const fromCdn = await tryCdnSidecar();
    if (fromCdn) return fromCdn;

    const detailUrl = `${base}/${detailRelPath(kind, normalizedSlug)}?${q}`;
    const detailRaw = await fetchSidecarText(detailUrl, signal);
    if (!detailRaw) return null;
    return performanceFromDetailJson(detailRaw, kind, normalizedSlug);
  })();

  sidecarInflight.set(key, promise);
  try {
    const result = await promise;
    if (result && cacheEnabled) sidecarResultCache.set(key, result);
    if (result && liveCacheEnabled) liveSidecarCache.set(key, { at: Date.now(), value: result });
    return result;
  } finally {
    sidecarInflight.delete(key);
  }
}
