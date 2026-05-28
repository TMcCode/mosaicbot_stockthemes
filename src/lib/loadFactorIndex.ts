import type { FactorIndexV0 } from "@/types/factor_index.v0";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";

function parseFactorIndex(raw: string): FactorIndexV0 {
  const data = JSON.parse(raw) as FactorIndexV0;
  if (data.schema_version !== "factor_index.v0" || !data.factors || typeof data.factors !== "object") {
    throw new Error("Invalid factor_index.v0 payload");
  }
  return data;
}

export async function loadFactorIndex(dataBaseUrl: string): Promise<FactorIndexV0 | null> {
  const base = (dataBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return null;
  const url = `${base}/factor_index.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) return null;
  const raw = await res.text();
  return parseFactorIndex(raw);
}

