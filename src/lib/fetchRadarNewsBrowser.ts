import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import { RADAR_NEWS_OBJECT, parseRadarNews } from "@/lib/parseRadarNews";
import type { RadarNewsV0 } from "@/types/radar_news.v0";

/** Browser URL for live In the News JSON (dev: same-origin rewrite). */
export function radarNewsBrowserUrl(): string | null {
  const base = stockthemesBrowserSidecarFetchBase();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${RADAR_NEWS_OBJECT}`;
}

/** Fetch live radar_news from CDN; fixture fallback; null on total failure. */
export async function fetchRadarNewsBrowser(): Promise<RadarNewsV0 | null> {
  const url = radarNewsBrowserUrl();
  if (url) {
    try {
      // Stable URL + ETag revalidation: every load sees a TimBot publish / bake within
      // seconds, and an unchanged file costs a 304 instead of a re-download.
      const res = await fetch(url, {
        credentials: "omit",
        cache: "no-cache",
      });
      if (res.ok) return parseRadarNews(await res.text());
    } catch {
      /* fall through to fixture */
    }
  }
  try {
    const res = await fetch(`/fixtures/${RADAR_NEWS_OBJECT}`, {
      credentials: "omit",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseRadarNews(await res.text());
  } catch {
    return null;
  }
}
