import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ThemeRank10dV0 } from "@/types/theme.detail.v0";

const RANK_PERIOD = "10D" as const;

export type Theme10DRankSnapshot = {
  period: typeof RANK_PERIOD;
  returnPct: number;
  universeRank: number;
  universeTotal: number;
  groupRank: number | null;
  groupTotal: number | null;
};

function pickPositiveInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : undefined;
}

/** Read ETL `rank_10d` from theme detail, manifest theme row, or compare bundle row. */
export function rank10dFromPayload(
  block: ThemeRank10dV0 | null | undefined,
): Theme10DRankSnapshot | null {
  if (!block || typeof block !== "object") return null;
  const universeRank = pickPositiveInt(block.universe_rank);
  const universeTotal = pickPositiveInt(block.universe_total);
  const returnPct = block.return_pct;
  if (
    universeRank == null ||
    universeTotal == null ||
    returnPct == null ||
    !Number.isFinite(returnPct)
  ) {
    return null;
  }
  const groupRank = pickPositiveInt(block.group_rank ?? undefined) ?? null;
  const groupTotal = pickPositiveInt(block.group_total ?? undefined) ?? null;
  return {
    period: RANK_PERIOD,
    returnPct,
    universeRank,
    universeTotal,
    groupRank,
    groupTotal,
  };
}

/**
 * Rank a theme by 10D return vs all themes and vs its group (higher return = better rank #1).
 * Fallback when `rank_10d` is not yet on theme JSON (dev fixtures / pre-ETL).
 */
export function computeTheme10DRanks(
  slug: string,
  groupSlug: string | null | undefined,
  rows: CompareThemesRowV0[],
): Theme10DRankSnapshot | null {
  const target = String(slug || "").trim();
  if (!target) return null;

  const scored: { slug: string; groupSlug: string; returnPct: number }[] = [];
  for (const row of rows) {
    const rowSlug = String(row.slug || "").trim();
    if (!rowSlug) continue;
    const returnPct = valueForTrendingColumn(
      RANK_PERIOD,
      row.compare_returns ?? undefined,
      {},
      String(row.name || ""),
    );
    if (returnPct == null || !Number.isFinite(returnPct)) continue;
    scored.push({
      slug: rowSlug,
      groupSlug: String(row.group_slug || "").trim(),
      returnPct,
    });
  }

  if (!scored.length) return null;

  scored.sort((a, b) => {
    if (b.returnPct !== a.returnPct) return b.returnPct - a.returnPct;
    return a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" });
  });

  const universeIdx = scored.findIndex((s) => s.slug === target);
  if (universeIdx < 0) return null;

  const groupKey = String(groupSlug || "").trim();
  let groupRank: number | null = null;
  let groupTotal: number | null = null;
  if (groupKey) {
    const inGroup = scored.filter((s) => s.groupSlug === groupKey);
    groupTotal = inGroup.length;
    const gIdx = inGroup.findIndex((s) => s.slug === target);
    groupRank = gIdx >= 0 ? gIdx + 1 : null;
  }

  return {
    period: RANK_PERIOD,
    returnPct: scored[universeIdx].returnPct,
    universeRank: universeIdx + 1,
    universeTotal: scored.length,
    groupRank,
    groupTotal,
  };
}

export function formatThemeRankPhrase(
  rank: number,
  total: number,
  suffix: string,
): string {
  return `#${rank.toLocaleString()} of ${total.toLocaleString()} ${suffix}`;
}
