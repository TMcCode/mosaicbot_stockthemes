import { parseJsonPayload } from "@/lib/parseJsonPayload";
import type { RadarNewsV0 } from "@/types/radar_news.v0";

export const RADAR_NEWS_OBJECT = "radar_news.v0.json";

export function parseRadarNews(raw: string): RadarNewsV0 {
  const data = parseJsonPayload<RadarNewsV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported radar_news schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !data.today) {
    throw new Error("Invalid radar_news JSON: missing as_of or today");
  }
  return data;
}
