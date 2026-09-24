import type { SearchIndexV0 } from "@/types/search_index.v0";

const DEFAULT_MAX = 4;

export type ThemeTickersPreview = {
  tickers: string[];
  /** Holdings beyond `tickers` (for +N). */
  more: number;
};

/** First N tickers per theme slug from search index (order is index order, not weight). */
export function buildTickersByThemeSlug(
  index: SearchIndexV0 | null | undefined,
  maxPerTheme: number = DEFAULT_MAX,
  /** When set, only build previews for these theme slugs (home feed strip). */
  onlySlugs?: Iterable<string> | null,
): Record<string, ThemeTickersPreview> {
  const out: Record<string, ThemeTickersPreview> = {};
  if (!index?.tickers?.length) return out;
  const cap = Math.max(1, maxPerTheme);
  const allow =
    onlySlugs == null
      ? null
      : new Set(
          [...onlySlugs]
            .map((s) => String(s || "").trim())
            .filter(Boolean),
        );
  if (allow && allow.size === 0) return out;
  const seen: Record<string, Set<string>> = {};
  for (const row of index.tickers) {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker) continue;
    for (const raw of row.theme_slugs || []) {
      const slug = String(raw || "").trim();
      if (!slug) continue;
      if (allow && !allow.has(slug)) continue;
      const set = seen[slug] ?? (seen[slug] = new Set());
      if (set.has(ticker)) continue;
      set.add(ticker);
      const entry = out[slug] ?? (out[slug] = { tickers: [], more: 0 });
      if (entry.tickers.length < cap) entry.tickers.push(ticker);
    }
  }
  for (const [slug, entry] of Object.entries(out)) {
    entry.more = Math.max(0, (seen[slug]?.size ?? entry.tickers.length) - entry.tickers.length);
  }
  return out;
}

/** Theme slugs that need a logo fallback (no holdings/membership preview on the event). */
export function feedSlotsNeedingTickerFallback(
  slots: Iterable<{
    lead: {
      theme_slug?: string | null;
      holdings_preview?: unknown;
      membership_preview?: unknown;
    };
    siblings?: Array<{
      theme_slug?: string | null;
      holdings_preview?: unknown;
      membership_preview?: unknown;
    }> | null;
  }>,
): Set<string> {
  const need = new Set<string>();
  for (const slot of slots) {
    const members = slot.siblings?.length ? slot.siblings : [slot.lead];
    for (const e of members) {
      const hasHoldings = Array.isArray(e.holdings_preview) && e.holdings_preview.length > 0;
      const hasMembership =
        Array.isArray(e.membership_preview) && e.membership_preview.length > 0;
      if (hasHoldings || hasMembership) continue;
      const slug = String(e.theme_slug || "").trim();
      if (slug) need.add(slug);
    }
  }
  return need;
}
