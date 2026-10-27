import { formatTickersPreviewFromParts } from "@/lib/constituentMeta";
import {
  loadSearchIndexBrowser,
  parseBrowserSearchIndex,
} from "@/lib/searchIndexBrowser";
import type { SiteSearchEngine, SiteSearchHit } from "@/lib/siteSearchRank";
import type { SearchIndexV0 } from "@/types/search_index.v0";

export type { SiteSearchEngine, SiteSearchHit };
export {
  collectSiteSearchHits,
  collectSiteSearchThemeHits,
  isTickerishQuery,
} from "@/lib/siteSearchRank";

export function parseSiteSearchIndex(raw: string): SearchIndexV0 {
  return parseBrowserSearchIndex(raw);
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
  const parsed = await loadSearchIndexBrowser();
  return { index: parsed };
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
