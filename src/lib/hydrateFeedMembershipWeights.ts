import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import type { ManifestHomeFeedEventV0, ManifestHomeFeedHoldingV0 } from "@/types/manifest.v0";

function eventSlug(evt: ManifestHomeFeedEventV0): string {
  return String(evt.theme_slug || "").trim();
}

/** Parse ``"AAPL, MSFT added"`` / ``"ETB.BO removed"`` phrases into chips. */
function holdingsFromChangesPreview(evt: ManifestHomeFeedEventV0): ManifestHomeFeedHoldingV0[] {
  const raw = Array.isArray(evt.changes_preview)
    ? evt.changes_preview.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const holdings: ManifestHomeFeedHoldingV0[] = [];
  for (const item of raw) {
    const m = item.match(/^(.+?)\s+(added|removed)$/i);
    if (!m) continue;
    const action = String(m[2] || "").toLowerCase();
    if (action !== "added" && action !== "removed") continue;
    const tickers = String(m[1] || "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    for (const ticker of tickers) {
      holdings.push({ ticker, action });
    }
  }
  return holdings;
}

function holdingNeedsWeight(h: ManifestHomeFeedHoldingV0): boolean {
  const action = String(h.action || "").trim().toLowerCase();
  if (action === "removed") return false;
  return !(h.weight != null && Number.isFinite(Number(h.weight)));
}

function membershipRows(evt: ManifestHomeFeedEventV0): ManifestHomeFeedHoldingV0[] {
  if (Array.isArray(evt.membership_preview) && evt.membership_preview.length) {
    return evt.membership_preview;
  }
  if (evt.kind === "theme_updated") {
    return holdingsFromChangesPreview(evt);
  }
  return [];
}

function eventNeedsMembershipWeights(evt: ManifestHomeFeedEventV0): boolean {
  if (evt.kind !== "theme_updated") return false;
  if (!eventSlug(evt)) return false;
  return membershipRows(evt).some(holdingNeedsWeight);
}

/** New theme cards missing holdings (or missing weights) — fill from theme detail. */
function eventNeedsNewThemeHoldings(evt: ManifestHomeFeedEventV0): boolean {
  if (evt.kind !== "theme_new") return false;
  if (!eventSlug(evt)) return false;
  const holdings = Array.isArray(evt.holdings_preview) ? evt.holdings_preview : [];
  if (!holdings.length) return true;
  return holdings.some(holdingNeedsWeight);
}

type DetailLike = {
  constituents?: Array<{
    ticker?: string;
    weight?: number | null;
    logo_url?: string | null;
    ticker_note?: string | null;
  }>;
} | null | undefined;

function weightMapFromDetail(detail: DetailLike): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of detail?.constituents || []) {
    const t = String(c?.ticker || "")
      .trim()
      .toUpperCase();
    if (!t) continue;
    const w = c?.weight;
    if (w == null || !Number.isFinite(Number(w))) continue;
    out.set(t, Number(w));
  }
  return out;
}

function holdingsFromDetail(detail: DetailLike): ManifestHomeFeedHoldingV0[] {
  const rows: ManifestHomeFeedHoldingV0[] = [];
  for (const c of detail?.constituents || []) {
    const ticker = String(c?.ticker || "")
      .trim()
      .toUpperCase();
    if (!ticker) continue;
    const item: ManifestHomeFeedHoldingV0 = { ticker };
    const w = c?.weight;
    if (w != null && Number.isFinite(Number(w))) item.weight = Number(w);
    const logo = String(c?.logo_url || "").trim();
    if (logo) item.logo_url = logo;
    const note = String(c?.ticker_note || "").trim();
    if (note) item.ticker_note = note;
    rows.push(item);
  }
  rows.sort((a, b) => {
    const wa = a.weight != null && Number.isFinite(Number(a.weight)) ? Number(a.weight) : -1;
    const wb = b.weight != null && Number.isFinite(Number(b.weight)) ? Number(b.weight) : -1;
    if (wb !== wa) return wb - wa;
    return String(a.ticker).localeCompare(String(b.ticker));
  });
  return rows;
}

function applyWeights(
  rows: ManifestHomeFeedHoldingV0[],
  weights: Map<string, number>,
): ManifestHomeFeedHoldingV0[] {
  return rows.map((h) => {
    if (!holdingNeedsWeight(h)) return h;
    const t = String(h.ticker || "")
      .trim()
      .toUpperCase();
    const w = weights.get(t);
    if (w == null) return h;
    return { ...h, weight: w };
  });
}

/**
 * Attach ThemeWgt onto membership chips when ETL omitted ``weight``, and
 * bake ``holdings_preview`` for ``theme_new`` from theme detail when missing.
 * Mutates events in place. Dedupes theme detail fetches by slug.
 *
 * Prefer ETL-baked ``membership_preview`` / ``holdings_preview`` on
 * ``home_feed_events`` (next manifest publish). This is a first-paint
 * fallback only — callers should pass a windowed event list, not the full feed.
 */
export async function hydrateFeedMembershipWeights(
  events: ManifestHomeFeedEventV0[],
  concurrency = 12,
): Promise<void> {
  const needSlugs = new Set<string>();
  for (const e of events) {
    if (eventNeedsMembershipWeights(e) || eventNeedsNewThemeHoldings(e)) {
      needSlugs.add(eventSlug(e));
    }
  }
  if (!needSlugs.size) return;

  const detailBySlug = new Map<string, DetailLike>();
  const slugs = [...needSlugs];
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (slug) => {
        const loaded = await getThemeDetailCached(slug).catch(() => null);
        detailBySlug.set(slug, loaded?.detail ?? null);
      }),
    );
  }

  for (const e of events) {
    const slug = eventSlug(e);
    const detail = detailBySlug.get(slug);
    if (!detail) continue;

    if (eventNeedsMembershipWeights(e)) {
      const weights = weightMapFromDetail(detail);
      if (weights.size) {
        const rows = membershipRows(e);
        if (rows.length) e.membership_preview = applyWeights(rows, weights);
      }
    }

    if (eventNeedsNewThemeHoldings(e)) {
      const fromDetail = holdingsFromDetail(detail);
      if (!fromDetail.length) continue;
      const existing = Array.isArray(e.holdings_preview) ? e.holdings_preview : [];
      if (!existing.length) {
        // Full list so /feed +N expand matches membership cards.
        e.holdings_preview = fromDetail;
        e.holdings_more_count = 0;
      } else {
        const weights = weightMapFromDetail(detail);
        e.holdings_preview = applyWeights(existing, weights);
      }
    }
  }
}
