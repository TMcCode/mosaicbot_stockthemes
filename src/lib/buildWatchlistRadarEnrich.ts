import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeRadarCardV0 } from "@/types/home_radar.v0";
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

/** Build enrich map from already-loaded compare_themes (+ optional thesis map). */
export function buildWatchlistRadarEnrichBySlug(
  compare: CompareThemesV0 | null | undefined,
  thesisBySlug?: Record<string, string> | null,
): Record<string, WatchlistRadarEnrichV0> {
  const out: Record<string, WatchlistRadarEnrichV0> = {};
  const put = (slugRaw: string, patch: WatchlistRadarEnrichV0) => {
    const slug = normalizeWatchlistKey("theme", slugRaw);
    if (!slug) return;
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
