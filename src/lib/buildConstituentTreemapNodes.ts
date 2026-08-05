import { inferMarketCapUsd } from "@/lib/constituentMeta";
import { priceReturnMetric, type ConstituentPriceReturnColumn } from "@/lib/constituentPriceReturns";
import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

/** Parquet / compare column keys exposed on each treemap tile. */
export type TreemapReturnColumn = ConstituentPriceReturnColumn | "Period";

export const TREEMAP_RETURN_PERIODS: { key: TreemapReturnColumn; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "10D", label: "10D" },
  { key: "1M", label: "1M" },
  { key: "MTD", label: "MTD" },
  { key: "YTD", label: "YTD" },
  { key: "Period", label: "1YR" },
];

export type ConstituentTreemapNode = {
  ticker: string;
  name: string;
  weight: number;
  logo_url?: string | null;
  returns: Partial<Record<TreemapReturnColumn, number | null>>;
};

/** True when ETL/sheet published ``weight`` (ThemeWgt), including explicit 0% untracked rows. */
function hasExplicitThemeWeights(constituents: ThemeDetailConstituentV0[]): boolean {
  return constituents.some((c) => typeof c.weight === "number" && Number.isFinite(c.weight));
}

function constituentWeight(c: ThemeDetailConstituentV0, useThemeWeights: boolean): number {
  if (useThemeWeights) {
    const w = c.weight;
    if (typeof w === "number" && Number.isFinite(w) && w > 0) return w;
    return 0;
  }
  const mcap = inferMarketCapUsd(c);
  if (mcap != null && mcap > 0) return mcap;
  return 0;
}

function normalizeNodeWeights(nodes: ConstituentTreemapNode[]): ConstituentTreemapNode[] {
  const total = nodes.reduce((s, n) => s + n.weight, 0);
  if (total <= 0) return [];
  return nodes.map((n) => ({
    ...n,
    weight: (n.weight / total) * 100,
  }));
}

function returnForColumn(
  c: ThemeDetailConstituentV0,
  col: TreemapReturnColumn,
): number | null {
  if (col === "Period") {
    const m = c.price_returns?.metrics;
    const v = m?.Period;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return priceReturnMetric(c, col);
}

export function buildConstituentTreemapNodes(
  constituents: ThemeDetailConstituentV0[] | undefined,
): ConstituentTreemapNode[] {
  if (!constituents?.length) return [];
  const useThemeWeights = hasExplicitThemeWeights(constituents);
  const nodes: ConstituentTreemapNode[] = [];
  for (const c of constituents) {
    const weight = constituentWeight(c, useThemeWeights);
    if (weight <= 0) continue;
    const returns: Partial<Record<TreemapReturnColumn, number | null>> = {};
    for (const { key } of TREEMAP_RETURN_PERIODS) {
      returns[key] = returnForColumn(c, key);
    }
    const logo = (c as { logo_url?: string | null }).logo_url;
    nodes.push({
      ticker: c.ticker,
      name: c.name?.trim() || c.ticker,
      weight,
      logo_url: typeof logo === "string" && logo.trim() ? logo.trim() : null,
      returns,
    });
  }
  return normalizeNodeWeights(nodes).sort((a, b) => b.weight - a.weight);
}

export function treemapHasReturnData(nodes: ConstituentTreemapNode[]): boolean {
  return nodes.some((n) =>
    TREEMAP_RETURN_PERIODS.some(({ key }) => n.returns[key] != null),
  );
}

/** Default color-by period: whichever has the most cross-tile |return| (avoids all-gray 1D when 1D is 0). */
export function pickDefaultTreemapPeriod(nodes: ConstituentTreemapNode[]): TreemapReturnColumn {
  const available = TREEMAP_RETURN_PERIODS.filter(({ key }) =>
    nodes.some((n) => n.returns[key] != null),
  );
  if (!available.length) return "1D";
  let best = available[0].key;
  let bestScore = -1;
  for (const { key } of available) {
    const score = nodes.reduce((sum, n) => {
      const v = n.returns[key];
      if (typeof v !== "number" || !Number.isFinite(v)) return sum;
      return sum + Math.abs(v);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}
