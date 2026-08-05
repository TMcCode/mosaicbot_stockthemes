import type { FactorTimeseriesV0 } from "@/types/factor_timeseries.v0";
import {
  priceReturnsBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";

/** Short (~1Y) default; long (~5Y) for overlay 2Y/5Y/custom-event windows. */
export type FactorTimeseriesHorizon = "short" | "long";

const FACTOR_TIMESERIES_PATH: Record<FactorTimeseriesHorizon, string> = {
  short: "factor_timeseries.v0.json",
  long: "factor_timeseries_long.v0.json",
};

function parseFactorTimeseries(raw: string): FactorTimeseriesV0 {
  const data = JSON.parse(raw) as FactorTimeseriesV0;
  if (data.schema_version !== "factor_timeseries.v0" || !data.factors || typeof data.factors !== "object") {
    throw new Error("Invalid factor_timeseries.v0 payload");
  }
  return data;
}

export async function loadFactorTimeseries(
  dataBaseUrl: string,
  horizon: FactorTimeseriesHorizon = "short",
): Promise<FactorTimeseriesV0 | null> {
  const base = (dataBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return null;
  // Match price-only ETL cadence so Factors charts pick up today's session after publish.
  const url = `${base}/${FACTOR_TIMESERIES_PATH[horizon]}?${priceReturnsBrowserCacheBusterQuery()}`;
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) return null;
  const raw = await res.text();
  return parseFactorTimeseries(raw);
}
