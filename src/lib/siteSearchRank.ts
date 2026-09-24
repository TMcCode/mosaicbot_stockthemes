import type Fuse from "fuse.js";

import type {
  SearchIndexGroupRowV0,
  SearchIndexThemeRowV0,
  SearchIndexTickerRowV0,
  SearchIndexV0,
} from "../types/search_index.v0";

/** Fuse threshold (0 = exact). Lower = stricter character matching. */
export const SITE_SEARCH_FUSE_THRESHOLD = 0.22;
/** Drop Fuse hits whose combined score is worse than this (0 = best). */
export const SITE_SEARCH_MAX_FUZZY_SCORE = 0.34;

/** 1–5 letter ticker-shaped queries (e.g. NVDA) — prefer symbol + membership, not loose fuzzy. */
export function isTickerishQuery(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const lettersOnly = q.replace(/[^a-zA-Z]/g, "");
  const compact = q.replace(/\s/g, "");
  return (
    lettersOnly.length > 0 &&
    lettersOnly.length === compact.length &&
    /^[A-Za-z]{1,5}$/.test(lettersOnly)
  );
}

export type SiteSearchFuseRow =
  | { kind: "ticker"; text: string; ref: SearchIndexTickerRowV0 }
  | { kind: "theme"; text: string; ref: SearchIndexThemeRowV0 }
  | { kind: "group"; text: string; ref: SearchIndexGroupRowV0 };

export type SiteSearchHit =
  | { kind: "ticker"; ref: SearchIndexTickerRowV0; key: string }
  | { kind: "theme"; ref: SearchIndexThemeRowV0; key: string }
  | { kind: "group"; ref: SearchIndexGroupRowV0; key: string };

export type SiteSearchEngine = { index: SearchIndexV0; fuse: Fuse<SiteSearchFuseRow> };

const MAX_HITS = 14;

function aliasesInclude(aliases: string[] | undefined, qLower: string): boolean {
  return (aliases ?? []).some((a) => a.toLowerCase().includes(qLower));
}

function themeDirectMatch(theme: SearchIndexThemeRowV0, qLower: string): boolean {
  return (
    theme.name.toLowerCase().includes(qLower) ||
    theme.slug.toLowerCase().includes(qLower) ||
    aliasesInclude(theme.aliases, qLower)
  );
}

function groupDirectMatch(group: SearchIndexGroupRowV0, qLower: string): boolean {
  return (
    group.name.toLowerCase().includes(qLower) ||
    group.slug.toLowerCase().includes(qLower) ||
    aliasesInclude(group.aliases, qLower)
  );
}

/**
 * Searchable text for Fuse. Tickers omit theme_names so a symbol query cannot
 * fuzzy-match unrelated themes via denormalized membership labels.
 */
export function buildSiteSearchFuseRows(index: SearchIndexV0): SiteSearchFuseRow[] {
  const rows: SiteSearchFuseRow[] = [];
  for (const t of index.tickers) {
    const parts = [t.ticker, t.name ?? "", ...(t.aliases ?? [])];
    rows.push({ kind: "ticker", text: parts.join(" ").trim(), ref: t });
  }
  for (const t of index.themes) {
    const parts = [t.name, t.slug, t.group_name ?? "", ...(t.aliases ?? [])];
    rows.push({ kind: "theme", text: parts.join(" ").trim(), ref: t });
  }
  for (const g of index.groups) {
    const parts = [g.name, g.slug, g.spy_sector ?? "", ...(g.aliases ?? [])];
    rows.push({ kind: "group", text: parts.join(" ").trim(), ref: g });
  }
  return rows;
}

function pushHit(out: SiteSearchHit[], seen: Set<string>, hit: SiteSearchHit, max = MAX_HITS): boolean {
  if (out.length >= max || seen.has(hit.key)) return out.length >= max;
  seen.add(hit.key);
  out.push(hit);
  return out.length >= max;
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
  const tickerish = isTickerishQuery(q);
  const upper = q.replace(/[^a-zA-Z]/g, "").toUpperCase();

  const seen = new Set<string>();
  const out: SiteSearchHit[] = [];
  const themesBySlug = new Map(index.themes.map((t) => [t.slug, t]));

  // 1) Ticker prefix matches (NVDA, AAPL, …)
  if (tickerish && upper.length >= 1) {
    const matches = index.tickers.filter((t) => t.ticker.startsWith(upper));
    matches.sort((a, b) => {
      const ex = a.ticker === upper ? 0 : 1;
      const ey = b.ticker === upper ? 0 : 1;
      if (ex !== ey) return ex - ey;
      return a.ticker.localeCompare(b.ticker);
    });
    for (const t of matches.slice(0, 10)) {
      if (pushHit(out, seen, { kind: "ticker", ref: t, key: `ticker:${t.ticker}` })) {
        return out;
      }
    }

    // Themes that actually hold those tickers (structured, not fuzzy).
    for (const t of matches.slice(0, 10)) {
      for (const slug of t.theme_slugs ?? []) {
        const theme = themesBySlug.get(slug);
        if (!theme) continue;
        if (pushHit(out, seen, { kind: "theme", ref: theme, key: `theme:${theme.slug}` })) {
          return out;
        }
      }
    }
  }

  if (q.length < 2 && !tickerish) {
    return out.slice(0, MAX_HITS);
  }

  // 2) Direct substring / alias hits (keeps curated keywords findable without fuzzy drift)
  for (const g of index.groups) {
    if (!groupDirectMatch(g, qLower)) continue;
    if (pushHit(out, seen, { kind: "group", ref: g, key: `group:${g.slug}` })) {
      return out;
    }
  }
  for (const t of index.themes) {
    if (!themeDirectMatch(t, qLower)) continue;
    if (pushHit(out, seen, { kind: "theme", ref: t, key: `theme:${t.slug}` })) {
      return out;
    }
  }
  if (!tickerish) {
    for (const t of index.tickers) {
      const name = (t.name ?? "").toLowerCase();
      if (t.ticker.toLowerCase().includes(qLower) || name.includes(qLower) || aliasesInclude(t.aliases, qLower)) {
        if (pushHit(out, seen, { kind: "ticker", ref: t, key: `ticker:${t.ticker}` })) {
          return out;
        }
      }
    }
  }

  // 3) Strict fuzzy only for non-tickerish queries (typos / partial words).
  if (!tickerish) {
    const fuzzy = fuse.search(q, { limit: 24 });
    for (const r of fuzzy) {
      if (out.length >= MAX_HITS) break;
      const score = typeof r.score === "number" ? r.score : 1;
      if (score > SITE_SEARCH_MAX_FUZZY_SCORE) continue;

      const row = r.item;
      const hit: SiteSearchHit =
        row.kind === "ticker"
          ? { kind: "ticker", ref: row.ref, key: `ticker:${row.ref.ticker}` }
          : row.kind === "theme"
            ? { kind: "theme", ref: row.ref, key: `theme:${row.ref.slug}` }
            : { kind: "group", ref: row.ref, key: `group:${row.ref.slug}` };
      pushHit(out, seen, hit);
    }
  }

  return out;
}

/**
 * Same ranking as {@link collectSiteSearchHits}, but results are themes only:
 * theme hits pass through; ticker hits expand to member themes; group hits
 * expand to themes in that group.
 */
export function collectSiteSearchThemeHits(
  index: SearchIndexV0,
  fuse: Fuse<SiteSearchFuseRow>,
  query: string,
  limit = 12,
): SearchIndexThemeRowV0[] {
  const hits = collectSiteSearchHits(index, fuse, query);
  if (!hits.length || limit <= 0) return [];

  const themesBySlug = new Map(index.themes.map((t) => [t.slug, t]));
  const seen = new Set<string>();
  const out: SearchIndexThemeRowV0[] = [];

  const pushTheme = (theme: SearchIndexThemeRowV0 | undefined): boolean => {
    if (!theme || out.length >= limit) return out.length >= limit;
    if (seen.has(theme.slug)) return false;
    seen.add(theme.slug);
    out.push(theme);
    return out.length >= limit;
  };

  for (const hit of hits) {
    if (out.length >= limit) break;
    if (hit.kind === "theme") {
      pushTheme(hit.ref);
      continue;
    }
    if (hit.kind === "ticker") {
      for (const slug of hit.ref.theme_slugs ?? []) {
        if (pushTheme(themesBySlug.get(slug))) break;
      }
      continue;
    }
    for (const theme of index.themes) {
      if (theme.group_slug !== hit.ref.slug) continue;
      if (pushTheme(theme)) break;
    }
  }

  return out;
}
