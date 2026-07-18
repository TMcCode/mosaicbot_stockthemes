import { formatTickersPreviewFromParts } from "@/lib/constituentMeta";
import type Fuse from "fuse.js";

import { hydrateSearchIndex } from "@/lib/hydrateSearchIndex";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type {
  SearchIndexGroupRowV0,
  SearchIndexThemeRowV0,
  SearchIndexTickerRowV0,
  SearchIndexV0,
} from "@/types/search_index.v0";

export type SiteSearchFuseRow =
  | { kind: "ticker"; text: string; ref: SearchIndexTickerRowV0 }
  | { kind: "theme"; text: string; ref: SearchIndexThemeRowV0 }
  | { kind: "group"; text: string; ref: SearchIndexGroupRowV0 };

export type SiteSearchHit =
  | { kind: "ticker"; ref: SearchIndexTickerRowV0; key: string }
  | { kind: "theme"; ref: SearchIndexThemeRowV0; key: string }
  | { kind: "group"; ref: SearchIndexGroupRowV0; key: string };

export type SiteSearchEngine = { index: SearchIndexV0; fuse: Fuse<SiteSearchFuseRow> };

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

export function buildSiteSearchFuseRows(index: SearchIndexV0): SiteSearchFuseRow[] {
  const rows: SiteSearchFuseRow[] = [];
  for (const t of index.tickers) {
    const parts = [t.ticker, t.name ?? "", ...(t.theme_names ?? []), ...(t.aliases ?? [])];
    rows.push({ kind: "ticker", text: parts.join(" ").trim(), ref: t });
  }
  for (const t of index.themes) {
    const parts = [t.name, t.slug, t.group_name ?? "", ...(t.aliases ?? [])];
    rows.push({ kind: "theme", text: parts.join(" ").trim(), ref: t });
  }
  for (const g of index.groups) {
    const parts = [g.name, g.slug, g.spy_sector ?? "", g.blurb_snippet ?? "", ...(g.aliases ?? [])];
    rows.push({ kind: "group", text: parts.join(" ").trim(), ref: g });
  }
  return rows;
}

export function collectSiteSearchHits(
  index: SearchIndexV0,
  fuse: Fuse<SiteSearchFuseRow>,
  query: string,
): SiteSearchHit[] {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const qLower = q.toLowerCase();

  const lettersOnly = q.replace(/[^a-zA-Z]/g, "");
  const upper = lettersOnly.toUpperCase();
  const compact = q.replace(/\s/g, "");
  const tickerish =
    lettersOnly.length > 0 &&
    lettersOnly.length === compact.length &&
    /^[A-Za-z]{1,5}$/.test(lettersOnly);

  const seen = new Set<string>();
  const out: SiteSearchHit[] = [];

  if (tickerish && upper.length >= 1) {
    const matches = index.tickers.filter((t) => t.ticker.startsWith(upper));
    matches.sort((a, b) => {
      const ex = a.ticker === upper ? 0 : 1;
      const ey = b.ticker === upper ? 0 : 1;
      if (ex !== ey) {
        return ex - ey;
      }
      return a.ticker.localeCompare(b.ticker);
    });
    for (const t of matches.slice(0, 10)) {
      const key = `ticker:${t.ticker}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ kind: "ticker", ref: t, key });
      }
    }
  }

  if (q.length < 2 && !tickerish) {
    return out.slice(0, 12);
  }

  const directGroupMatches = index.groups
    .filter((g) => {
      const name = g.name.toLowerCase();
      const slug = g.slug.toLowerCase();
      return name.includes(qLower) || slug.includes(qLower);
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 2);
  for (const g of directGroupMatches) {
    const key = `group:${g.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ kind: "group", ref: g, key });
    }
  }

  const fuzzy = fuse.search(q, { limit: 20 });
  const fuzzyHits: SiteSearchHit[] = [];
  for (const r of fuzzy) {
    const row = r.item;
    let key: string;
    if (row.kind === "ticker") {
      key = `ticker:${row.ref.ticker}`;
    } else if (row.kind === "theme") {
      key = `theme:${row.ref.slug}`;
    } else {
      key = `group:${row.ref.slug}`;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    fuzzyHits.push(
      row.kind === "ticker"
        ? { kind: "ticker", ref: row.ref, key }
        : row.kind === "theme"
          ? { kind: "theme", ref: row.ref, key }
          : { kind: "group", ref: row.ref, key },
    );
  }

  const MAX_HITS = 14;
  const reservedGroups = fuzzyHits.filter((h) => h.kind === "group").slice(0, 2);
  const reservedThemes = fuzzyHits.filter((h) => h.kind === "theme").slice(0, 2);
  const promotedKeys = new Set<string>();
  for (const h of [...reservedGroups, ...reservedThemes]) {
    if (out.length >= MAX_HITS || promotedKeys.has(h.key)) {
      continue;
    }
    promotedKeys.add(h.key);
    out.push(h);
  }

  for (const h of fuzzyHits) {
    if (out.length >= MAX_HITS) {
      break;
    }
    if (promotedKeys.has(h.key)) {
      continue;
    }
    out.push(h);
  }

  return out;
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
    threshold: 0.38,
    ignoreLocation: true,
    minMatchCharLength: 1,
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
