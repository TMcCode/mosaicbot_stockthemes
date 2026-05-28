import type { FactorRowsV0 } from "@/types/factor_rows.v0";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";

function parseFactorRows(raw: string): FactorRowsV0 {
  const data = JSON.parse(raw) as FactorRowsV0;
  if (data.schema_version !== "factor_rows.v0" || !Array.isArray(data.entries)) {
    throw new Error("Invalid factor_rows.v0 payload");
  }
  return data;
}

export async function loadFactorRows(dataBaseUrl: string, factorId: string): Promise<FactorRowsV0 | null> {
  const base = (dataBaseUrl || "").trim().replace(/\/$/, "");
  const fid = String(factorId || "").trim();
  if (!base || !fid) return null;
  const url = `${base}/factor_rows/${encodeURIComponent(fid)}.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) return null;
  const raw = await res.text();
  return parseFactorRows(raw);
}

