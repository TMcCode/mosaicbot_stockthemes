import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

const CACHE_FILE = "home_feed.v0.json";

export type HomeFeedV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  events: ManifestHomeFeedEventV0[];
};

export type HomeFeedLoadResult = {
  bundle: HomeFeedV0;
  source: "live" | "missing";
};

/**
 * Compact feed sidecar (~80–200KB) written next to manifest by ETL.
 * Prefer this over ``manifest.home_feed_events`` so home/feed need not
 * rely on the 600-row blob embedded in the 1MB manifest.
 */
export async function loadHomeFeed(): Promise<HomeFeedLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  try {
    const raw = await fetchPublicJsonText(`${base.replace(/\/$/, "")}/${CACHE_FILE}`, CACHE_FILE);
    const data = parseJsonPayload<HomeFeedV0>(raw);
    if (data.schema_version !== 0) return null;
    if (!Array.isArray(data.events)) return null;
    return { bundle: data, source: "live" };
  } catch {
    return null;
  }
}
