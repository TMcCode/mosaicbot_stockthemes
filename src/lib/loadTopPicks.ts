import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { TopPicksV0 } from "@/types/top_picks.v0";

const FIXTURE_REL = path.join("public", "fixtures", "top_picks.v0.json");

let memoizedPromise: Promise<TopPicksLoadResult | null> | null = null;

function parseTopPicks(raw: string): TopPicksV0 {
  const data = parseJsonPayload<TopPicksV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported top_picks schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.theme_slugs) || !Array.isArray(data.group_slugs)) {
    throw new Error("Invalid top_picks JSON: missing as_of, theme_slugs, or group_slugs");
  }
  return data;
}

export type TopPicksLoadResult = {
  bundle: TopPicksV0;
  source: "live" | "fixture";
};

async function loadTopPicksInternal(): Promise<TopPicksLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/top_picks.v0.json`;
    try {
      const raw = await fetchPublicJsonText(url, "top_picks.v0.json");
      const bundle = parseTopPicks(raw);
      return { bundle, source: "live" };
    } catch {
      // CDN may not have top_picks until next full manifest publish.
    }
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    const bundle = parseTopPicks(raw);
    return { bundle, source: "fixture" };
  } catch {
    return null;
  }
}

/** Compact Top Picks slug sets for /compare (memoized outside dev). */
export async function loadTopPicks(): Promise<TopPicksLoadResult | null> {
  if (process.env.NODE_ENV !== "development") {
    if (!memoizedPromise) {
      memoizedPromise = loadTopPicksInternal();
    }
    return memoizedPromise;
  }
  return loadTopPicksInternal();
}
