import type Fuse from "fuse.js";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { SearchIndexThemeRowV0, SearchIndexV0 } from "@/types/search_index.v0";

export type ThemeFuseRow = { text: string; ref: SearchIndexThemeRowV0 };

export function parseSearchIndex(raw: string): SearchIndexV0 {
  const data = parseJsonPayload<SearchIndexV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported search index schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.themes)) {
    throw new Error("Invalid search index JSON");
  }
  return data;
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

export function buildThemeFuseRows(index: SearchIndexV0): ThemeFuseRow[] {
  return index.themes.map((t) => ({
    text: [t.name, t.slug, t.group_name ?? "", ...(t.aliases ?? [])].join(" ").trim(),
    ref: t,
  }));
}

export async function createThemeSearchFuse(
  rows: ThemeFuseRow[],
): Promise<Fuse<ThemeFuseRow>> {
  const { default: FuseCtor } = await import("fuse.js");
  return new FuseCtor(rows, {
    keys: ["text"],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

export function searchThemeHits(
  index: SearchIndexV0,
  fuse: Fuse<ThemeFuseRow>,
  query: string,
  limit = 10,
): SearchIndexThemeRowV0[] {
  const q = query.trim();
  if (!q) return [];
  const qLower = q.toLowerCase();
  const seen = new Set<string>();
  const out: SearchIndexThemeRowV0[] = [];

  for (const t of index.themes) {
    if (out.length >= limit) break;
    const slug = t.slug.toLowerCase();
    const name = t.name.toLowerCase();
    if (name.includes(qLower) || slug.includes(qLower)) {
      if (!seen.has(slug)) {
        seen.add(slug);
        out.push(t);
      }
    }
  }

  if (q.length >= 2) {
    for (const r of fuse.search(q, { limit: limit * 2 })) {
      if (out.length >= limit) break;
      const slug = r.item.ref.slug.toLowerCase();
      if (!seen.has(slug)) {
        seen.add(slug);
        out.push(r.item.ref);
      }
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
