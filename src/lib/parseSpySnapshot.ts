import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

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
  asOf?: string;
  chartPerf: ChartPerfReturns;
  compareReturns?: ThemeCompareReturnsV0;
  benchmarkPerformance?: ChartPerformanceV0;
};

export function parseSpySnapshotJson(raw: unknown): SpyMarketPerf | null {
  try {
    const data = parseJsonPayload<SpySnapshotV0>(raw);
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
    return {
      asOf: typeof data.as_of === "string" ? data.as_of : undefined,
      chartPerf,
      compareReturns,
      benchmarkPerformance: data.performance,
    };
  } catch {
    return null;
  }
}

export function parseSpySnapshotText(raw: string): SpyMarketPerf | null {
  try {
    return parseSpySnapshotJson(JSON.parse(raw));
  } catch {
    return null;
  }
}
