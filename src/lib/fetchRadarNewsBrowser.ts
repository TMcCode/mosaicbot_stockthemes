import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import { RADAR_NEWS_OBJECT, parseRadarNews } from "@/lib/parseRadarNews";
import {
  commentaryBrowserCacheBusterQuery,
  commentaryBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { RadarNewsV0 } from "@/types/radar_news.v0";

/** Browser URL for live In the News JSON (dev: same-origin rewrite). */
export function radarNewsBrowserUrl(): string | null {
  const base = stockthemesBrowserSidecarFetchBase();
  if (!base) return null;
  // ~5 min window (same as commentary) — not the 2h general GCS bucket, or
  // weekday 8× top-story bakes stay invisible until hard refresh.
  const q = commentaryBrowserCacheBusterQuery();
  return `${base.replace(/\/$/, "")}/${RADAR_NEWS_OBJECT}?${q}`;
}

/** Fetch live radar_news from CDN; fixture fallback; null on total failure. */
export async function fetchRadarNewsBrowser(): Promise<RadarNewsV0 | null> {
  const url = radarNewsBrowserUrl();
  if (url) {
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: commentaryBrowserFetchCache(),
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
