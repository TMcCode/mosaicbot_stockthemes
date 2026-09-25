import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeRadarCardV0, HomeRadarV0 } from "@/types/home_radar.v0";
import { normalizeWatchlistKey } from "@/lib/watchlist/api";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";

/** Slim fields to flesh out watchlist radar cards without extra network. */
export type WatchlistRadarEnrichV0 = {
  name?: string | null;
  return_1m?: number | null;
  thesis?: string | null;
  group_name?: string | null;
  tickers_preview?: HomeRadarCardV0["tickers_preview"];
  tickers_preview_more?: number | null;
};

function collectCardSlugs(cards: HomeRadarCardV0[] | undefined, into: Set<string>) {
  for (const c of cards || []) {
    const slug = normalizeWatchlistKey("theme", c.slug || "");
    if (slug) into.add(slug);
    if (c.siblings?.length) collectCardSlugs(c.siblings, into);
  }
}

/**
 * Slugs worth shipping enrich for on home: radar strip + feed cards + thesis map.
 * Keeps watchlist cards useful without serializing every compare_themes row.
 */
export function collectHomeWatchlistEnrichSlugs(opts: {
  radar?: HomeRadarV0 | null;
  feedThemeSlugs?: Iterable<string> | null;
  thesisBySlug?: Record<string, string> | null;
}): Set<string> {
  const out = new Set<string>();
  const tabs = opts.radar?.tabs;
  if (tabs) {
    collectCardSlugs(tabs.new?.home, out);
    collectCardSlugs(tabs.new?.all, out);
    collectCardSlugs(tabs.accelerating?.home, out);
    collectCardSlugs(tabs.accelerating?.all, out);
    collectCardSlugs(tabs.fading?.home, out);
    collectCardSlugs(tabs.fading?.all, out);
  }
  for (const raw of opts.feedThemeSlugs || []) {
    const slug = normalizeWatchlistKey("theme", raw);
    if (slug) out.add(slug);
  }
  if (opts.thesisBySlug) {
    for (const raw of Object.keys(opts.thesisBySlug)) {
      const slug = normalizeWatchlistKey("theme", raw);
      if (slug) out.add(slug);
    }
  }
  return out;
}

export type BuildWatchlistRadarEnrichOpts = {
  /** When set, only these slugs are emitted (home). Omit on `/radar` for full map. */
  slugAllowlist?: Iterable<string> | null;
};

/** Build enrich map from already-loaded compare_themes (+ optional thesis map). */
export function buildWatchlistRadarEnrichBySlug(
  compare: CompareThemesV0 | null | undefined,
  thesisBySlug?: Record<string, string> | null,
  opts?: BuildWatchlistRadarEnrichOpts,
): Record<string, WatchlistRadarEnrichV0> {
  const allow =
    opts?.slugAllowlist != null ? new Set(
      [...opts.slugAllowlist]
        .map((s) => normalizeWatchlistKey("theme", s))
        .filter(Boolean),
    ) : null;
  const allowed = (slug: string) => !allow || allow.has(slug);

  const out: Record<string, WatchlistRadarEnrichV0> = {};
  const put = (slugRaw: string, patch: WatchlistRadarEnrichV0) => {
    const slug = normalizeWatchlistKey("theme", slugRaw);
    if (!slug || !allowed(slug)) return;
    const prev = out[slug] || {};
    out[slug] = {
      name: patch.name ?? prev.name,
      return_1m: patch.return_1m ?? prev.return_1m,
      thesis: patch.thesis ?? prev.thesis,
      group_name: patch.group_name ?? prev.group_name,
      tickers_preview: patch.tickers_preview ?? prev.tickers_preview,
      tickers_preview_more: patch.tickers_preview_more ?? prev.tickers_preview_more,
    };
  };

  for (const row of compare?.rows || []) {
    const r1m = valueForTrendingColumn("1M", row.compare_returns ?? undefined, {}, row.name);
    put(row.slug, {
      name: row.name,
      return_1m: r1m ?? null,
      group_name: row.group_name ?? null,
      tickers_preview: row.tickers_preview,
      tickers_preview_more: row.tickers_preview_more ?? null,
    });
  }

  if (thesisBySlug) {
    for (const [slug, thesis] of Object.entries(thesisBySlug)) {
      const t = String(thesis || "").trim();
      if (!t) continue;
      put(slug, { thesis: t });
    }
  }

  return out;
}

export function applyWatchlistRadarEnrich(
  card: HomeRadarCardV0,
  enrich: WatchlistRadarEnrichV0 | undefined,
  addedAt: string | undefined,
): HomeRadarCardV0 {
  if (!enrich && !addedAt) return card;
  return {
    ...card,
    name: card.name || enrich?.name || card.slug,
    return_1m: card.return_1m ?? enrich?.return_1m ?? null,
    thesis: card.thesis || enrich?.thesis || null,
    group_name: card.group_name || enrich?.group_name || null,
    tickers_preview: card.tickers_preview?.length
      ? card.tickers_preview
      : enrich?.tickers_preview,
    tickers_preview_more:
      card.tickers_preview_more ?? enrich?.tickers_preview_more ?? null,
    // Prefer watchlist add date over theme catalog created_at for the "Added …" chip.
    created_at: addedAt || card.created_at || null,
    signal_label:
      addedAt || card.signal_label === "Watchlist" ? null : card.signal_label ?? null,
  };
}
