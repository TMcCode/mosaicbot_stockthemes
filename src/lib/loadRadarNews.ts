import { readFile } from "fs/promises";
import path from "path";

import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import { RADAR_NEWS_OBJECT, parseRadarNews } from "@/lib/parseRadarNews";
import type { RadarNewsV0 } from "@/types/radar_news.v0";

export { RADAR_NEWS_OBJECT, parseRadarNews } from "@/lib/parseRadarNews";

const FIXTURE_REL = path.join("public", "fixtures", "radar_news.v0.json");

export type RadarNewsLoadResult = {
  bundle: RadarNewsV0;
  source: "live" | "fixture";
};

/**
 * Loads baked In the News payload.
 * Prefer live CDN (`radar_news.v0.json` on stockthemes-public); fixture fallback for offline.
 */
export async function loadRadarNews(): Promise<RadarNewsLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base.replace(/\/$/, "")}/${RADAR_NEWS_OBJECT}`;
    try {
      const raw = await fetchPublicJsonText(url, RADAR_NEWS_OBJECT);
      return { bundle: parseRadarNews(raw), source: "live" };
    } catch (err) {
      console.warn("[loadRadarNews] live miss:", err);
    }
  }
  try {
    const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf-8");
    return { bundle: parseRadarNews(raw), source: "fixture" };
  } catch (err) {
    console.warn("[loadRadarNews] fixture miss:", err);
    return null;
  }
}
