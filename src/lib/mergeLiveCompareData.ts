import type { TopMoverTickerItem, TopMoverTickerPeriod } from "@/lib/buildTopMoversTicker";
import { pickHomeTopMovers } from "@/lib/pickHomeTopMovers";
import type { CompareThemesRowV0, CompareThemesV0 } from "@/types/compare_themes.v0";
import type { HomeTopMoversV0 } from "@/types/home_top_movers.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

function normName(value: string | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function indexCompareRows(rows: CompareThemesRowV0[]): {
  bySlug: Map<string, CompareThemesRowV0>;
  byName: Map<string, CompareThemesRowV0>;
} {
  const bySlug = new Map<string, CompareThemesRowV0>();
  const byName = new Map<string, CompareThemesRowV0>();
  for (const row of rows) {
    const slug = String(row.slug || "").trim();
    if (slug) bySlug.set(slug, row);
    const nameKey = normName(row.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, row);
  }
  return { bySlug, byName };
}

export function liveCompareRowForTheme(
  slug: string | null | undefined,
  name: string | undefined,
  liveRows: CompareThemesRowV0[],
): CompareThemesRowV0 | undefined {
  const { bySlug, byName } = indexCompareRows(liveRows);
  const s = String(slug || "").trim();
  if (s && bySlug.has(s)) return bySlug.get(s);
  const nameKey = normName(name);
  return nameKey ? byName.get(nameKey) : undefined;
}

export function mergeCompareReturnsField(
  server: ThemeCompareReturnsV0 | null | undefined,
  live: ThemeCompareReturnsV0 | null | undefined,
): ThemeCompareReturnsV0 | null | undefined {
  return live ?? server;
}

export function mergeHomeTrendingCompareReturns<
  T extends { slug: string | null; name: string; marketBaseline?: boolean; compare_returns?: ThemeCompareReturnsV0 },
>(rows: T[], liveRows: CompareThemesRowV0[]): T[] {
  const { bySlug, byName } = indexCompareRows(liveRows);
  return rows.map((row) => {
    if (row.marketBaseline) return row;
    const live =
      (row.slug && bySlug.get(row.slug)) || byName.get(normName(row.name));
    if (!live?.compare_returns) return row;
    return { ...row, compare_returns: live.compare_returns };
  });
}

export type ComparePageRow = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  tickersPreview?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

export function mergeComparePageRows(
  serverRows: ComparePageRow[],
  liveRows: CompareThemesRowV0[],
): ComparePageRow[] {
  const { bySlug, byName } = indexCompareRows(liveRows);
  return serverRows.map((row) => {
    const live =
      bySlug.get(String(row.slug || "").trim()) || byName.get(normName(row.name));
    if (!live?.compare_returns) return row;
    return { ...row, compareReturns: live.compare_returns };
  });
}

export function pickTopMoversWithLiveBundle(
  serverBundle: HomeTopMoversV0 | null | undefined,
  liveBundle: HomeTopMoversV0 | null | undefined,
  period: TopMoverTickerPeriod,
): TopMoverTickerItem[] {
  const liveItems = pickHomeTopMovers(liveBundle, period);
  if (liveItems.length > 0) return liveItems;
  return pickHomeTopMovers(serverBundle, period);
}

export function parseCompareThemesJson(raw: unknown): CompareThemesV0 | null {
  try {
    const data = raw as CompareThemesV0;
    if (data.schema_version !== 0) return null;
    if (!data.as_of || !Array.isArray(data.rows)) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseHomeTopMoversJson(raw: unknown): HomeTopMoversV0 | null {
  try {
    const data = raw as HomeTopMoversV0;
    if (data.schema_version !== 0) return null;
    if (!data.as_of || !Array.isArray(data.movers_1d) || !Array.isArray(data.movers_10d)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
