import { parseJsonPayload } from "@/lib/parseJsonPayload";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ChartPerformanceSidecarV0 } from "@/types/chart_performance.v0";
import type { ChartPerformanceV0 } from "@/types/chart.v0";

export const CHART_SIDECAR_SUFFIX = ".chart.v0.json";

export type OverlayEntityKind = "theme" | "group";

export function overlayItemKey(kind: OverlayEntityKind, slug: string): string {
  return `${kind}:${slug.trim()}`;
}

export function parseOverlayItemKey(raw: string): { kind: OverlayEntityKind; slug: string } | null {
  const s = String(raw || "").trim();
  const idx = s.indexOf(":");
  if (idx <= 0) return null;
  const kind = s.slice(0, idx) as OverlayEntityKind;
  const slug = s.slice(idx + 1).trim();
  if ((kind !== "theme" && kind !== "group") || !slug) return null;
  return { kind, slug };
}

export function parseChartPerformanceSidecar(raw: string): ChartPerformanceSidecarV0 | null {
  try {
    const data = parseJsonPayload<ChartPerformanceSidecarV0>(raw);
    if (data.schema_version !== "chart_performance.v0") return null;
    if (!data.slug || !data.name || !data.performance?.dates?.length || !data.performance?.values?.length) {
      return null;
    }
    if (data.entity_type !== "theme" && data.entity_type !== "group") return null;
    return data;
  } catch {
    return null;
  }
}

function sidecarRelPath(kind: OverlayEntityKind, slug: string): string {
  const enc = encodeURIComponent(slug);
  return kind === "theme" ? `themes/${enc}${CHART_SIDECAR_SUFFIX}` : `groups/${enc}${CHART_SIDECAR_SUFFIX}`;
}

function detailRelPath(kind: OverlayEntityKind, slug: string): string {
  const enc = encodeURIComponent(slug);
  return kind === "theme" ? `themes/${enc}.json` : `groups/${enc}.json`;
}

function performanceFromDetailJson(raw: string, kind: OverlayEntityKind, slug: string): ChartPerformanceSidecarV0 | null {
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

/** Fetch slim chart sidecar; fall back to chart_1y embedded in full detail JSON. */
export async function fetchChartSidecar(
  kind: OverlayEntityKind,
  slug: string,
  signal?: AbortSignal,
): Promise<ChartPerformanceSidecarV0 | null> {
  const key = overlayItemKey(kind, slug);
  if (sidecarResultCache.has(key)) return sidecarResultCache.get(key)!;

  const inflight = sidecarInflight.get(key);
  if (inflight) return inflight;

  const base = stockthemesPublicDataBase();
  if (!base) return null;

  const promise = (async () => {
    const q = stockthemesBrowserCacheBusterQuery();
    const sidecarUrl = `${base}/${sidecarRelPath(kind, slug)}?${q}`;
    try {
      const res = await fetch(sidecarUrl, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
        signal,
      });
      if (res.ok) {
        const parsed = parseChartPerformanceSidecar(await res.text());
        if (parsed) return parsed;
      }
    } catch (e) {
      if (signal?.aborted) throw e;
    }

    const detailUrl = `${base}/${detailRelPath(kind, slug)}?${q}`;
    try {
      const res = await fetch(detailUrl, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
        signal,
      });
      if (!res.ok) return null;
      return performanceFromDetailJson(await res.text(), kind, slug);
    } catch (e) {
      if (signal?.aborted) throw e;
      return null;
    }
  })();

  sidecarInflight.set(key, promise);
  try {
    const result = await promise;
    sidecarResultCache.set(key, result);
    return result;
  } finally {
    sidecarInflight.delete(key);
  }
}
