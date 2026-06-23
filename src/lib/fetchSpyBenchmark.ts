import { parseSpySnapshotText } from "@/lib/parseSpySnapshot";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesBrowserSidecarFetchBase, stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ChartPerformanceV0 } from "@/types/chart.v0";

let cachedPerf: ChartPerformanceV0 | null | undefined;
let inflight: Promise<ChartPerformanceV0 | null> | null = null;

/** Lazy-load full SPY indexed series for 2Y/5Y/custom chart windows (one small JSON fetch). */
export async function fetchSpyBenchmarkPerformance(
  signal?: AbortSignal,
): Promise<ChartPerformanceV0 | null> {
  if (cachedPerf !== undefined) return cachedPerf;
  if (inflight) return inflight;

  inflight = (async () => {
    const base = stockthemesBrowserSidecarFetchBase() ?? stockthemesPublicDataBase();
    if (!base) {
      cachedPerf = null;
      return null;
    }
    const url = `${base}/spy_snapshot.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
        signal,
      });
      if (!res.ok) {
        cachedPerf = null;
        return null;
      }
      const parsed = parseSpySnapshotText(await res.text());
      const perf = parsed?.benchmarkPerformance;
      cachedPerf =
        perf?.dates?.length && perf?.values?.length ? perf : null;
      return cachedPerf;
    } catch (e) {
      if (signal?.aborted) throw e;
      cachedPerf = null;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
