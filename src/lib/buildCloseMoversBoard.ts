import type { TopMoverTickerItem } from "@/lib/buildTopMoversTicker";
import type { RadarNewsCardV0, RadarNewsV0 } from "@/types/radar_news.v0";

export type CloseMoversBoardHeadline = {
  title: string;
  url: string;
  sourceName?: string | null;
  publishedAt?: string;
};

export type CloseMoversBoardRow = {
  slug: string;
  name: string;
  returnPct: number;
  rank: number;
  tier: "top" | "bottom";
  headlines: CloseMoversBoardHeadline[];
};

export type CloseMoversBoardPayload = {
  top: CloseMoversBoardRow[];
  bottom: CloseMoversBoardRow[];
};

const DEFAULT_N = 10;
const DEFAULT_HEADLINES = 2;

function headlinesFromCard(card: RadarNewsCardV0, max: number): CloseMoversBoardHeadline[] {
  const out: CloseMoversBoardHeadline[] = [];
  const seen = new Set<string>();
  for (const h of card.headlines || []) {
    if (out.length >= max) break;
    const title = String(h.title || "").trim();
    const url = String(h.url || "").trim();
    if (!title || !url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      url,
      sourceName: h.source_name ?? null,
      publishedAt: h.published_at,
    });
  }
  return out;
}

/** Collect cards for today + prior history day only (empty is fine until movers news runs). */
function cardsForBoardNews(news: RadarNewsV0 | null | undefined): RadarNewsCardV0[] {
  if (!news?.today) return [];
  const todayPool = (news.today.all?.length ? news.today.all : news.today.home) || [];
  const prior = (news.history || [])[0];
  const priorPool = prior
    ? (prior.all?.length ? prior.all : prior.home) || []
    : [];
  return [...todayPool, ...priorPool];
}

function newsBySlug(
  news: RadarNewsV0 | null | undefined,
  maxHeadlines: number,
): Map<string, CloseMoversBoardHeadline[]> {
  const map = new Map<string, CloseMoversBoardHeadline[]>();
  for (const card of cardsForBoardNews(news)) {
    const slug = String(card.slug || "").trim();
    if (!slug) continue;
    const next = headlinesFromCard(card, maxHeadlines);
    if (!next.length) continue;
    const prev = map.get(slug) || [];
    if (prev.length >= maxHeadlines) continue;
    const merged = [...prev];
    const seen = new Set(merged.map((h) => h.url.toLowerCase()));
    for (const h of next) {
      if (merged.length >= maxHeadlines) break;
      const key = h.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(h);
    }
    map.set(slug, merged);
  }
  return map;
}

function toRows(
  items: TopMoverTickerItem[],
  tier: "top" | "bottom",
  n: number,
  bySlug: Map<string, CloseMoversBoardHeadline[]>,
): CloseMoversBoardRow[] {
  return items
    .filter((i) => i.tier === tier)
    .slice(0, n)
    .map((i) => ({
      slug: i.slug,
      name: i.name,
      returnPct: i.returnPct,
      rank: i.rank,
      tier,
      headlines: bySlug.get(i.slug) || [],
    }));
}

/**
 * Top/bottom N from the same ticker list, with ≤2 radar_news headlines per theme
 * (today + prior day only). Empty headlines are fine until the movers news job runs.
 */
export function buildCloseMoversBoard(
  items: TopMoverTickerItem[],
  news: RadarNewsV0 | null | undefined,
  options?: { n?: number; maxHeadlines?: number },
): CloseMoversBoardPayload | null {
  const n = options?.n ?? DEFAULT_N;
  const maxHeadlines = options?.maxHeadlines ?? DEFAULT_HEADLINES;
  const safe = Array.isArray(items) ? items : [];
  const bySlug = newsBySlug(news, maxHeadlines);
  const top = toRows(safe, "top", n, bySlug);
  const bottom = toRows(safe, "bottom", n, bySlug);
  if (!top.length && !bottom.length) return null;
  return { top, bottom };
}
