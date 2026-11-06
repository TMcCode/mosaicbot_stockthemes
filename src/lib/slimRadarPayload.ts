import type { HomeRadarV0 } from "@/types/home_radar.v0";
import type { RadarNewsV0 } from "@/types/radar_news.v0";
import { collectRadarPreviewTickers } from "@/lib/normalizeRadarTickers";

const HOME_PREVIEW = 6;
/** About three wrapped lines on a home news card. CSS clamps anything longer. */
const HOME_NEWS_SNIPPET_MAX = 220;

function trimHomeSnippet(text: string | null | undefined): string | null | undefined {
  if (text == null) return text;
  const s = String(text).replace(/\s+/g, " ").trim();
  if (s.length <= HOME_NEWS_SNIPPET_MAX) return s;
  const cut = s.slice(0, HOME_NEWS_SNIPPET_MAX);
  const word = cut.lastIndexOf(" ");
  return (word > 80 ? cut.slice(0, word) : cut).replace(/[\s,;:–—-]+$/, "");
}

/** Drop ``all`` / history so home only ships the 2×3 strip. */
export function slimRadarForHome(
  radar: HomeRadarV0 | null,
  limit = HOME_PREVIEW,
): HomeRadarV0 | null {
  if (!radar?.tabs) return radar;
  const trim = (
    home: HomeRadarV0["tabs"]["new"]["home"],
    all: HomeRadarV0["tabs"]["new"]["all"],
  ) => {
    const pool = (all?.length ? all : home) || [];
    const sliced = pool.slice(0, limit);
    return { home: sliced, all: sliced };
  };
  return {
    ...radar,
    tabs: {
      new: trim(radar.tabs.new?.home || [], radar.tabs.new?.all || []),
      accelerating: trim(
        radar.tabs.accelerating?.home || [],
        radar.tabs.accelerating?.all || [],
      ),
      fading: trim(radar.tabs.fading?.home || [], radar.tabs.fading?.all || []),
    },
  };
}

/** Home only needs today.home; history stays on `/radar`. */
export function slimNewsForHome(
  news: RadarNewsV0 | null,
  limit = HOME_PREVIEW,
): RadarNewsV0 | null {
  if (!news?.today) return news;
  const pool = (news.today.all?.length ? news.today.all : news.today.home) || [];
  const sliced = pool.slice(0, limit).map((card) => ({
    ...card,
    headlines: (card.headlines || []).map((hl) => ({
      ...hl,
      snippet: trimHomeSnippet(hl.snippet),
    })),
  }));
  return {
    ...news,
    history: undefined,
    today: {
      ...news.today,
      home: sliced,
      all: sliced,
    },
  };
}

export function slimCompanyNamesForRadar(
  companyNames: Record<string, string> | undefined,
  radar: HomeRadarV0 | null,
  news: RadarNewsV0 | null,
): Record<string, string> | undefined {
  if (!companyNames) return undefined;
  const want = collectRadarPreviewTickers(
    radar?.tabs?.new?.home,
    radar?.tabs?.new?.all,
    radar?.tabs?.accelerating?.home,
    radar?.tabs?.accelerating?.all,
    radar?.tabs?.fading?.home,
    radar?.tabs?.fading?.all,
    news?.today?.home,
    news?.today?.all,
    ...(news?.history || []).flatMap((d) => [d.home, d.all]),
  );
  if (!want.size) return undefined;
  const out: Record<string, string> = {};
  for (const t of want) {
    const n = companyNames[t];
    if (n) out[t] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Prefer company names already baked on radar/news tickers (no search-index fetch). */
export function companyNamesFromRadarBundles(
  radar: HomeRadarV0 | null,
  news: RadarNewsV0 | null,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const ingest = (rows: unknown) => {
    if (!Array.isArray(rows)) return;
    for (const card of rows) {
      if (!card || typeof card !== "object") continue;
      const tickers = (card as { tickers_preview?: unknown }).tickers_preview;
      if (!Array.isArray(tickers)) continue;
      for (const t of tickers) {
        if (!t || typeof t !== "object") continue;
        const row = t as { ticker?: string; company_name?: string; name?: string };
        const sym = String(row.ticker || "")
          .trim()
          .toUpperCase();
        const name = String(row.company_name || row.name || "").trim();
        if (sym && name) out[sym] = name;
      }
    }
  };
  ingest(radar?.tabs?.new?.home);
  ingest(radar?.tabs?.new?.all);
  ingest(radar?.tabs?.accelerating?.home);
  ingest(radar?.tabs?.accelerating?.all);
  ingest(radar?.tabs?.fading?.home);
  ingest(radar?.tabs?.fading?.all);
  ingest(news?.today?.home);
  ingest(news?.today?.all);
  for (const d of news?.history || []) {
    ingest(d.home);
    ingest(d.all);
  }
  return Object.keys(out).length ? out : undefined;
}
