import { formatTickersPreviewFromParts } from "@/lib/constituentMeta";
import type Fuse from "fuse.js";

import { hydrateSearchIndex } from "@/lib/hydrateSearchIndex";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import {
  buildSiteSearchFuseRows,
  collectSiteSearchHits,
  SITE_SEARCH_FUSE_THRESHOLD,
  type SiteSearchEngine,
  type SiteSearchFuseRow,
  type SiteSearchHit,
} from "@/lib/siteSearchRank";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { SearchIndexV0 } from "@/types/search_index.v0";

export type { SiteSearchEngine, SiteSearchFuseRow, SiteSearchHit };
export {
  buildSiteSearchFuseRows,
  collectSiteSearchHits,
  isTickerishQuery,
  SITE_SEARCH_FUSE_THRESHOLD,
  SITE_SEARCH_MAX_FUZZY_SCORE,
} from "@/lib/siteSearchRank";

export function parseSiteSearchIndex(raw: string): SearchIndexV0 {
  const data = parseJsonPayload<SearchIndexV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported search index schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.tickers) || !Array.isArray(data.themes) || !Array.isArray(data.groups)) {
    throw new Error("Invalid search index JSON");
  }
  return hydrateSearchIndex(data);
}

/** Theme slug → comma-separated tickers for legend previews (from search index, no group JSON). */
export function buildThemeTickersPreviewMapFromSearchIndex(index: SearchIndexV0): Map<string, string> {
  const byTheme = new Map<string, string[]>();
  for (const row of index.tickers) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker) continue;
    for (const slug of row.theme_slugs ?? []) {
      const key = String(slug || "").trim();
      if (!key) continue;
      const list = byTheme.get(key) ?? [];
      if (!list.includes(ticker)) list.push(ticker);
      byTheme.set(key, list);
    }
  }
  const out = new Map<string, string>();
  for (const [slug, tickers] of byTheme) {
    const preview = formatTickersPreviewFromParts(tickers, 0);
    if (preview) out.set(slug, preview);
  }
  return out;
}

export async function loadSiteSearchEngine(): Promise<SiteSearchEngine> {
  const urls = searchIndexFetchUrls();
  const buster = stockthemesBrowserCacheBusterQuery();
  let lastErr: unknown;
  let raw: string | null = null;

  for (const baseUrl of urls) {
    const url = baseUrl.includes("?") ? `${baseUrl}&${buster}` : `${baseUrl}?${buster}`;
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
        ...(process.env.NODE_ENV === "development" ? { cache: "no-store" as const } : {}),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      raw = await res.text();
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!raw) {
    throw lastErr instanceof Error ? lastErr : new Error("Failed to load search index");
  }

  const { default: FuseCtor } = await import("fuse.js");
  const parsed = parseSiteSearchIndex(raw);
  const fuse = new FuseCtor(buildSiteSearchFuseRows(parsed), {
    keys: ["text"],
    threshold: SITE_SEARCH_FUSE_THRESHOLD,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  }) as Fuse<SiteSearchFuseRow>;

  return { index: parsed, fuse };
}

/** Overlay chart series key for a search hit (tickers map to their primary theme). */
export function overlaySeriesKeyFromHit(hit: SiteSearchHit): string | null {
  if (hit.kind === "theme") {
    return `theme:${hit.ref.slug}`;
  }
  if (hit.kind === "group") {
    return `group:${hit.ref.slug}`;
  }
  const slug = hit.ref.theme_slugs[0];
  return slug ? `theme:${slug}` : null;
}
