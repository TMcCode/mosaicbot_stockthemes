import { computePerfFromChartPerformance } from "@/lib/computeThemePerf";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import { rank10dFromPayload } from "@/lib/themeCompareRank";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { GroupDetailV0 } from "@/types/group.detail.v0";
import type { ThemeRank10dV0 } from "@/types/theme.detail.v0";

const RANK_PERIOD = "10D" as const;

export type Group10DRankSnapshot = {
  period: typeof RANK_PERIOD;
  returnPct: number;
  universeRank: number;
  universeTotal: number;
};

/** Read ETL `rank_10d` from group detail or manifest group row. */
export function rank10dFromGroupPayload(
  block: ThemeRank10dV0 | null | undefined,
): Group10DRankSnapshot | null {
  return rank10dFromPayload(block);
}

/** 10D % for one group: equal-weight mean of child theme compare_returns, else chart performance. */
export function group10dReturnPctFromDetail(detail: GroupDetailV0 | undefined): number | null {
  const themes = detail?.theme_treemap?.themes;
  if (Array.isArray(themes) && themes.length > 0) {
    const vals: number[] = [];
    for (const t of themes) {
      const v = valueForTrendingColumn("10D", t.compare_returns ?? undefined, {}, String(t.name || ""));
      if (v != null && Number.isFinite(v)) vals.push(v);
    }
    if (vals.length > 0) {
      return vals.reduce((sum, v) => sum + v, 0) / vals.length;
    }
  }
  const perf = detail?.chart_1y?.performance;
  const chart = computePerfFromChartPerformance(perf);
  if (chart.d10 != null && Number.isFinite(chart.d10)) return chart.d10;
  return null;
}

/**
 * Rank a group by equal-weight average 10D return of its themes (from compare bundle).
 * Fallback when `rank_10d` is not on group JSON yet.
 */
export function computeGroup10DRanks(
  groupSlug: string,
  rows: CompareThemesRowV0[],
): Group10DRankSnapshot | null {
  const target = String(groupSlug || "").trim();
  if (!target) return null;

  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const gslug = String(row.group_slug || "").trim();
    if (!gslug) continue;
    const returnPct = valueForTrendingColumn(
      RANK_PERIOD,
      row.compare_returns ?? undefined,
      {},
      String(row.name || ""),
    );
    if (returnPct == null || !Number.isFinite(returnPct)) continue;
    const prev = sums.get(gslug) ?? { sum: 0, count: 0 };
    prev.sum += returnPct;
    prev.count += 1;
    sums.set(gslug, prev);
  }

  const scored: { slug: string; returnPct: number }[] = [];
  for (const [slug, { sum, count }] of sums) {
    if (count > 0) scored.push({ slug, returnPct: sum / count });
  }
  if (!scored.length) return null;

  scored.sort((a, b) => {
    if (b.returnPct !== a.returnPct) return b.returnPct - a.returnPct;
    return a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" });
  });

  const idx = scored.findIndex((s) => s.slug === target);
  if (idx < 0) return null;

  return {
    period: RANK_PERIOD,
    returnPct: scored[idx].returnPct,
    universeRank: idx + 1,
    universeTotal: scored.length,
  };
}
