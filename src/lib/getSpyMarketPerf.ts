import { readFile } from "fs/promises";
import path from "path";

import { parseSpySnapshotText, type SpyMarketPerf } from "@/lib/parseSpySnapshot";
import {
  fetchPublicJsonText,
  stockthemesBuildCacheEnabled,
} from "@/lib/stockthemesBuildCache";
import { stockthemesLiveFetchInit, stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

const FIXTURE_REL = path.join("public", "fixtures", "spy_snapshot.v0.json");

export type { SpyMarketPerf };

let memoizedSpyPerfPromise: Promise<SpyMarketPerf | null> | null = null;

async function loadFixtureSpyPerf(): Promise<SpyMarketPerf | null> {
  try {
    const abs = path.join(process.cwd(), FIXTURE_REL);
    const raw = await readFile(abs, "utf-8");
    return parseSpySnapshotText(raw);
  } catch {
    return null;
  }
}

/**
 * Load SPY metrics from public GCS snapshot (same base as manifest/home_trending),
 * fallback to local fixture in offline/dev flows.
 */
export async function getSpyMarketPerfCached(): Promise<SpyMarketPerf | null> {
  // Keep dev hot-reload behavior fresh; memoize in build/prod to avoid repeated
  // fetch + parse per route (e.g. many theme/group pages during static export).
  if (process.env.NODE_ENV !== "development") {
    if (!memoizedSpyPerfPromise) {
      memoizedSpyPerfPromise = getSpyMarketPerfInternal();
    }
    return memoizedSpyPerfPromise;
  }
  return getSpyMarketPerfInternal();
}

async function getSpyMarketPerfInternal(): Promise<SpyMarketPerf | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/spy_snapshot.v0.json`;
    try {
      if (stockthemesBuildCacheEnabled()) {
        const parsed = parseSpySnapshotText(
          await fetchPublicJsonText(url, "spy_snapshot.v0.json"),
        );
        if (parsed) return parsed;
      } else {
        const res = await fetch(url, {
          ...stockthemesLiveFetchInit(),
          // Prevent slow external fetch from delaying homepage render.
          signal: AbortSignal.timeout(1200),
        });
        if (res.ok) {
          const parsed = parseSpySnapshotText(await res.text());
          if (parsed) return parsed;
        }
      }
    } catch {
      // Fall through to fixture.
    }
  }

  return loadFixtureSpyPerf();
}
