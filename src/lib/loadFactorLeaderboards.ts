import type { FactorLeaderboardsV0 } from "@/types/factor_leaderboards.v0";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";

function parseFactorLeaderboards(raw: string): FactorLeaderboardsV0 {
  const data = JSON.parse(raw) as FactorLeaderboardsV0;
  if (data.schema_version !== "factor_leaderboards.v0" || !data.factors || typeof data.factors !== "object") {
    throw new Error("Invalid factor_leaderboards.v0 payload");
  }
  return data;
}

export async function loadFactorLeaderboards(dataBaseUrl: string): Promise<FactorLeaderboardsV0 | null> {
  const base = (dataBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return null;
  const url = `${base}/factor_leaderboards.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() });
  if (!res.ok) return null;
  const raw = await res.text();
  return parseFactorLeaderboards(raw);
}
