/**
 * Browser search-index loader with stale-while-revalidate:
 * serve the first successful URL immediately (prod: same-origin baked file),
 * then peek CDN `as_of` via Range and only full-download when newer.
 */

import { hydrateSearchIndex } from "@/lib/hydrateSearchIndex";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import {
  parseAsOfFromSearchIndexPrefix,
  searchIndexAsOfNewer,
} from "@/lib/searchIndexAsOf";
import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { warmSiteSearchIndex } from "@/lib/siteSearchRank";
import type { SearchIndexV0 } from "@/types/search_index.v0";

export {
  parseAsOfFromSearchIndexPrefix,
  searchIndexAsOfNewer,
} from "@/lib/searchIndexAsOf";

const SEARCH_OBJECT = "search_index.v0.json";
const AS_OF_PEEK_BYTES = 511;

type Listener = (index: SearchIndexV0) => void;

let cached: SearchIndexV0 | null = null;
let loadPromise: Promise<SearchIndexV0> | null = null;
let revalidateStarted = false;
const listeners = new Set<Listener>();

export function parseBrowserSearchIndex(raw: string): SearchIndexV0 {
  const data = parseJsonPayload<SearchIndexV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported search index schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.tickers) || !Array.isArray(data.themes) || !Array.isArray(data.groups)) {
    throw new Error("Invalid search index JSON");
  }
  return hydrateSearchIndex(data);
}

export function getCachedSearchIndex(): SearchIndexV0 | null {
  return cached;
}

export function subscribeSearchIndex(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(index: SearchIndexV0): void {
  cached = index;
  warmSiteSearchIndex(index);
  for (const listener of listeners) {
    try {
      listener(index);
    } catch {
      // ignore subscriber errors
    }
  }
}

function withCacheBuster(baseUrl: string): string {
  const buster = stockthemesBrowserCacheBusterQuery();
  return baseUrl.includes("?") ? `${baseUrl}&${buster}` : `${baseUrl}?${buster}`;
}

function fetchInit(): RequestInit {
  return {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
  };
}

function searchIndexUpstreamBaseUrl(): string | undefined {
  const base = stockthemesPublicDataBase();
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/${SEARCH_OBJECT}`;
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://localhost");
    u.search = "";
    u.hash = "";
    return `${u.origin}${u.pathname}`.replace(/\/$/, "") || u.origin;
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}

function isSameSearchIndexUrl(a: string, b: string): boolean {
  return normalizeUrlKey(a) === normalizeUrlKey(b);
}

async function fetchSearchIndexFromUrl(baseUrl: string): Promise<SearchIndexV0> {
  const res = await fetch(withCacheBuster(baseUrl), fetchInit());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return parseBrowserSearchIndex(await res.text());
}

async function peekUpstreamAsOf(upstreamBase: string): Promise<string | null> {
  try {
    const res = await fetch(withCacheBuster(upstreamBase), {
      ...fetchInit(),
      headers: { Range: `bytes=0-${AS_OF_PEEK_BYTES}` },
    });
    if (!(res.ok || res.status === 206)) {
      return null;
    }
    return parseAsOfFromSearchIndexPrefix(await res.text());
  } catch {
    return null;
  }
}

function scheduleUpstreamRevalidate(current: SearchIndexV0, primaryUrl: string): void {
  if (revalidateStarted) return;
  const upstream = searchIndexUpstreamBaseUrl();
  if (!upstream) return;
  // Already loaded the live object (dev prefers upstream first).
  if (isSameSearchIndexUrl(primaryUrl, upstream)) return;

  revalidateStarted = true;
  void (async () => {
    try {
      const remoteAsOf = await peekUpstreamAsOf(upstream);
      if (!remoteAsOf || !searchIndexAsOfNewer(remoteAsOf, current.as_of)) {
        return;
      }
      const fresh = await fetchSearchIndexFromUrl(upstream);
      if (!searchIndexAsOfNewer(fresh.as_of, current.as_of)) {
        return;
      }
      // Another tab/load may have moved cache forward already.
      if (cached && !searchIndexAsOfNewer(fresh.as_of, cached.as_of)) {
        return;
      }
      publish(fresh);
    } catch {
      // Keep baked/primary index.
    }
  })();
}

/**
 * Load search index: first successful URL in {@link searchIndexFetchUrls}, then
 * background CDN refresh when upstream `as_of` is newer.
 */
export async function loadSearchIndexBrowser(): Promise<SearchIndexV0> {
  if (cached) {
    return cached;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const urls = searchIndexFetchUrls();
    let lastErr: unknown;
    for (const baseUrl of urls) {
      try {
        const index = await fetchSearchIndexFromUrl(baseUrl);
        publish(index);
        scheduleUpstreamRevalidate(index, baseUrl);
        return index;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Failed to load search index");
  })();

  try {
    return await loadPromise;
  } catch (e) {
    loadPromise = null;
    throw e;
  }
}
