import type { TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type HomeTrendingSortRow = {
  slug: string | null;
  name: string;
  marketBaseline?: boolean;
  compare_returns?: ThemeCompareReturnsV0;
  chartPerf: ChartPerfReturns;
};

/** Default homepage trending order: sort period descending (best performers first). */
export function sortHomeTrendingRows<T extends HomeTrendingSortRow>(
  rows: T[],
  sortPeriod: TopMoverTickerPeriod,
): T[] {
  return [...rows].sort((a, b) => {
    const va = valueForTrendingColumn(sortPeriod, a.compare_returns, a.chartPerf, a.name);
    const vb = valueForTrendingColumn(sortPeriod, b.compare_returns, b.chartPerf, b.name);
    const aOk = va != null && Number.isFinite(va);
    const bOk = vb != null && Number.isFinite(vb);
    if (aOk && bOk) return vb - va;
    if (aOk) return -1;
    if (bOk) return 1;
    return 0;
  });
}
