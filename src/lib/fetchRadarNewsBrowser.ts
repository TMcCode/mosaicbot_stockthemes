import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import { RADAR_NEWS_OBJECT, parseRadarNews } from "@/lib/parseRadarNews";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { RadarNewsV0 } from "@/types/radar_news.v0";

/** Browser URL for live In the News JSON (dev: same-origin rewrite). */
export function radarNewsBrowserUrl(): string | null {
  const base = stockthemesBrowserSidecarFetchBase();
  if (!base) return null;
  const q = stockthemesBrowserCacheBusterQuery();
  return `${base.replace(/\/$/, "")}/${RADAR_NEWS_OBJECT}?${q}`;
}

/** Fetch live radar_news from CDN; null on failure. */
export async function fetchRadarNewsBrowser(): Promise<RadarNewsV0 | null> {
  const url = radarNewsBrowserUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
    });
    if (!res.ok) return null;
    return parseRadarNews(await res.text());
  } catch {
    return null;
  }
}
