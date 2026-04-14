import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { stockthemesLiveFetchInit, stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { HomeTrendingV0 } from "@/types/home_trending.v0";

const FIXTURE_REL = path.join("public", "fixtures", "home_trending.v0.json");

function parseHomeTrending(raw: string): HomeTrendingV0 {
  const data = parseJsonPayload<HomeTrendingV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported home_trending schema_version: ${data.schema_version}`);
  }
  if (!data.as_of || !Array.isArray(data.rows)) {
    throw new Error("Invalid home_trending JSON: missing as_of or rows");
  }
  return data;
}

export type HomeTrendingLoadResult = {
  bundle: HomeTrendingV0;
  source: "live" | "fixture";
};

/**
 * Loads `home_trending.v0.json` from the public data origin (same bucket as manifest) or fixtures.
 * Returns null if the object is missing (404) or the fixture file is absent — callers fall back to per-theme loads.
 */
export async function loadHomeTrending(): Promise<HomeTrendingLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/home_trending.v0.json`;
    const res = await fetch(url, stockthemesLiveFetchInit());
    if (!res.ok) {
      return null;
    }
    const bundle = parseHomeTrending(await res.text());
    return { bundle, source: "live" };
  }

  const abs = path.join(process.cwd(), FIXTURE_REL);
  try {
    const raw = await readFile(abs, "utf-8");
    const bundle = parseHomeTrending(raw);
    return { bundle, source: "fixture" };
  } catch {
    return null;
  }
}
