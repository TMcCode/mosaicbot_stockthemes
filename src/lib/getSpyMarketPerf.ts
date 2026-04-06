import { readFile } from "fs/promises";
import path from "path";

import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

const FIXTURE_REL = path.join("public", "fixtures", "spy_snapshot.v0.json");

type SpySnapshotV0 = {
  schema_version: 0;
  as_of: string;
  ticker: "SPY" | string;
  columns?: string[];
  performance?: ChartPerformanceV0;
  metrics: {
    "1D"?: number | null;
    "10D"?: number | null;
    MTD?: number | null;
    YTD?: number | null;
    Period?: number | null;
    [key: string]: number | null | undefined;
  };
};

export type SpyMarketPerf = {
  chartPerf: ChartPerfReturns;
  compareReturns?: ThemeCompareReturnsV0;
  benchmarkPerformance?: ChartPerformanceV0;
};

let memoizedSpyPerfPromise: Promise<SpyMarketPerf | null> | null = null;

function parseSpySnapshot(raw: string): SpyMarketPerf | null {
  try {
    const data = JSON.parse(raw) as SpySnapshotV0;
    if (data.schema_version !== 0 || !data.metrics) return null;
    const m = data.metrics;
    const chartPerf: ChartPerfReturns = {
      d1: typeof m["1D"] === "number" ? m["1D"] : undefined,
      d10: typeof m["10D"] === "number" ? m["10D"] : undefined,
      mtd: typeof m.MTD === "number" ? m.MTD : undefined,
      ytd: typeof m.YTD === "number" ? m.YTD : undefined,
      y1: typeof m.Period === "number" ? m.Period : undefined,
    };
    const metricMap: Record<string, number | null> = Object.fromEntries(
      Object.entries(m)
        .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
        .map(([k, v]) => [k, v as number]),
    );
    const compareReturns: ThemeCompareReturnsV0 = {
      source: "spy_snapshot.v0",
      metrics: metricMap,
      columns: Array.isArray(data.columns) ? data.columns : undefined,
    };
    return { chartPerf, compareReturns, benchmarkPerformance: data.performance };
  } catch {
    return null;
  }
}

async function loadFixtureSpyPerf(): Promise<SpyMarketPerf | null> {
  try {
    const abs = path.join(process.cwd(), FIXTURE_REL);
    const raw = await readFile(abs, "utf-8");
    return parseSpySnapshot(raw);
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
    try {
      const url = `${base}/spy_snapshot.v0.json`;
      const isDev = process.env.NODE_ENV === "development";
      const res = await fetch(url, {
        ...(isDev ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
        // Prevent slow external fetch from delaying homepage render.
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const parsed = parseSpySnapshot(await res.text());
        if (parsed) return parsed;
      }
    } catch {
      // Fall through to fixture.
    }
  }

  return loadFixtureSpyPerf();
}
