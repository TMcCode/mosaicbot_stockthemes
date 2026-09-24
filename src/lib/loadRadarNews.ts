import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import type { RadarNewsV0 } from "@/types/radar_news.v0";

const FIXTURE_REL = path.join("public", "fixtures", "radar_news.v0.json");

function parseRadarNews(raw: string): RadarNewsV0 {
  const data = parseJsonPayload<RadarNewsV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported radar_news schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !data.today) {
    throw new Error("Invalid radar_news JSON: missing as_of or today");
  }
  return data;
}

export type RadarNewsLoadResult = {
  bundle: RadarNewsV0;
  source: "fixture" | "live";
};

/**
 * Loads baked In the News payload.
 * Prefer local fixture (always available after a bake); live CDN later via stockthemesPublicDataBase.
 */
export async function loadRadarNews(): Promise<RadarNewsLoadResult | null> {
  try {
    const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf-8");
    return { bundle: parseRadarNews(raw), source: "fixture" };
  } catch (err) {
    console.warn("[loadRadarNews] fixture miss:", err);
    return null;
  }
}
