import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { FactorSpreadsV0 } from "@/types/factor_spreads.v0";
import type { FactorTimeseriesV0 } from "@/types/factor_timeseries.v0";

export type OverlayFactorSpreadOption = {
  factorId: string;
  name: string;
  proxy?: string;
  dayReturnPct?: number | null;
};

export type OverlayFactorSpreadCatalogEntry = OverlayFactorSpreadOption & {
  performance?: ChartPerformanceV0;
};

export function overlayFactorSpreadItemKey(factorId: string): string {
  return `factor-spread:${String(factorId || "").trim().toUpperCase()}`;
}

export function parseOverlayFactorSpreadItemKey(raw: string): string | null {
  const s = String(raw || "").trim();
  if (!s.startsWith("factor-spread:")) return null;
  const id = s.slice("factor-spread:".length).trim().toUpperCase();
  return id || null;
}

/** Overlay Factor Spreads picker omits MARKET — S&P 500 is already a dedicated benchmark. */
export const OVERLAY_FACTOR_SPREAD_EXCLUDED_IDS = new Set(["MARKET"]);

function dayReturnPctFromMetrics(
  metrics: Record<string, number | null | undefined> | undefined,
): number | null {
  const raw = metrics?.["1D"];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

function factorTimeseriesBucket(
  timeseries: FactorTimeseriesV0 | null | undefined,
  factorId: string,
) {
  if (!timeseries?.factors) return undefined;
  const direct = timeseries.factors[factorId];
  if (direct) return direct;
  const hit = Object.entries(timeseries.factors).find(([k]) => k.toUpperCase() === factorId);
  return hit?.[1];
}

/** Lightweight options for the overlay Factor Spreads picker (no chart series yet). */
export function mapOverlayFactorSpreadOptions(
  bundle: FactorSpreadsV0 | null | undefined,
): OverlayFactorSpreadOption[] {
  const out: OverlayFactorSpreadOption[] = [];
  for (const row of bundle?.rows ?? []) {
    const factorId = String(row.factor_id || "").trim().toUpperCase();
    if (!factorId || OVERLAY_FACTOR_SPREAD_EXCLUDED_IDS.has(factorId)) continue;
    const name = String(row.name || factorId).trim();
    const proxy = String(row.proxy || "").trim() || undefined;
    out.push({
      factorId,
      name,
      proxy,
      dayReturnPct: dayReturnPctFromMetrics(row.compare_returns?.metrics),
    });
  }
  return out;
}

export function mergeFactorTimeseriesIntoCatalog(
  options: OverlayFactorSpreadOption[],
  timeseries: FactorTimeseriesV0 | null | undefined,
): Record<string, OverlayFactorSpreadCatalogEntry> {
  const out: Record<string, OverlayFactorSpreadCatalogEntry> = {};
  for (const opt of options) {
    const bucket = factorTimeseriesBucket(timeseries, opt.factorId);
    const dates = bucket?.dates ?? [];
    const values = (bucket?.values ?? []).map(Number);
    const performance =
      dates.length && values.length && dates.length === values.length
        ? { dates: dates.map(String), values }
        : undefined;
    out[opt.factorId] = {
      ...opt,
      name: String(bucket?.label || opt.name).trim() || opt.factorId,
      performance,
    };
  }
  for (const [fid, bucket] of Object.entries(timeseries?.factors ?? {})) {
    const factorId = String(fid || "").trim().toUpperCase();
    if (!factorId || out[factorId] || OVERLAY_FACTOR_SPREAD_EXCLUDED_IDS.has(factorId)) continue;
    const dates = bucket?.dates ?? [];
    const values = (bucket?.values ?? []).map(Number);
    if (!dates.length || !values.length || dates.length !== values.length) continue;
    out[factorId] = {
      factorId,
      name: String(bucket.label || factorId).trim() || factorId,
      performance: { dates: dates.map(String), values },
    };
  }
  return out;
}

export function factorsFromSearchParams(
  searchParams: URLSearchParams,
  allowedIds: Set<string>,
): string[] {
  const raw = searchParams.get("factors");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((id) => allowedIds.has(id));
}
