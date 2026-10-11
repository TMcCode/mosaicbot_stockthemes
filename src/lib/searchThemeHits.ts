import { hydrateSearchIndex } from "@/lib/hydrateSearchIndex";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import {
  isTickerishQuery,
  rankDirectSearchHits,
  rankTypoCorrectedHits,
  shouldRunTypoFallback,
} from "@/lib/siteSearchRank";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { SearchIndexThemeRowV0, SearchIndexV0 } from "@/types/search_index.v0";

export { warmSiteSearchIndex } from "@/lib/siteSearchRank";

export function parseSearchIndex(raw: string): SearchIndexV0 {
  const data = parseJsonPayload<SearchIndexV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported search index schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.themes)) {
    throw new Error("Invalid search index JSON");
  }
  return hydrateSearchIndex(data);
}

export async function loadSearchIndexClient(): Promise<SearchIndexV0 | null> {
  const urls = searchIndexFetchUrls();
  const buster = stockthemesBrowserCacheBusterQuery();
  let lastErr: unknown;
  for (const baseUrl of urls) {
    const url = baseUrl.includes("?") ? `${baseUrl}&${buster}` : `${baseUrl}?${buster}`;
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return parseSearchIndex(await res.text());
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr instanceof Error) {
    throw lastErr;
  }
  return null;
}

export function searchThemeHits(
  index: SearchIndexV0,
  query: string,
  limit = 10,
): SearchIndexThemeRowV0[] {
  const q = query.trim();
  if (!q) return [];
  const seen = new Set<string>();
  const out: SearchIndexThemeRowV0[] = [];
  const tickerish = isTickerishQuery(q);
  const upper = q.replace(/[^a-zA-Z]/g, "").toUpperCase();

  // Ticker-shaped: themes that actually contain that ticker (membership), then direct name/alias hits.
  if (tickerish && upper.length >= 1) {
    const themesBySlug = new Map(index.themes.map((t) => [t.slug, t]));
    const tickers = index.tickers.filter((t) => t.ticker.startsWith(upper));
    for (const t of tickers) {
      for (const slug of t.theme_slugs ?? []) {
        if (out.length >= limit) return out;
        const theme = themesBySlug.get(slug);
        if (!theme) continue;
        const key = theme.slug.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(theme);
      }
    }
  }

  const direct = rankDirectSearchHits(index, q, { kinds: ["theme"] });
  for (const hit of direct) {
    if (out.length >= limit) break;
    if (hit.kind !== "theme") continue;
    const slug = hit.ref.slug.toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(hit.ref);
  }

  // Spell-corrected query only for non-tickerish queries, and only when direct matching came up short.
  if (!tickerish && shouldRunTypoFallback(direct.length)) {
    for (const hit of rankTypoCorrectedHits(index, q, { kinds: ["theme"] })) {
      if (out.length >= limit) break;
      if (hit.kind !== "theme") continue;
      const slug = hit.ref.slug.toLowerCase();
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push(hit.ref);
    }
  }

  return out.slice(0, limit);
}

/** Saved themes in watchlist order (for empty-query suggestions). */
export function recentSavedThemes(
  savedSlugs: ReadonlySet<string>,
  index: SearchIndexV0,
  limit = 8,
): SearchIndexThemeRowV0[] {
  const bySlug = new Map(index.themes.map((t) => [t.slug.toLowerCase(), t]));
  const out: SearchIndexThemeRowV0[] = [];
  for (const slug of savedSlugs) {
    const row = bySlug.get(slug);
    if (row) out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
