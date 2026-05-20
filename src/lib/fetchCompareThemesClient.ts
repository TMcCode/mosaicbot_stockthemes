import { parseJsonPayload } from "@/lib/parseJsonPayload";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";

function parseCompareThemes(raw: string): CompareThemesV0 {
  const data = parseJsonPayload<CompareThemesV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported compare_themes schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.rows)) {
    throw new Error("Invalid compare_themes JSON");
  }
  return data;
}

export async function fetchCompareThemesClient(): Promise<CompareThemesV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const url = `${base}/compare_themes.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, { cache: stockthemesBrowserFetchCache() });
  if (!res.ok) return null;
  const raw = await res.text();
  return parseCompareThemes(raw);
}
