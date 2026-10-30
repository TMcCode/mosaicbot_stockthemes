import {
  TREEMAP_RETURN_PERIODS,
  type ConstituentTreemapNode,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import { applyShortThemeCompareReturnsDisplay } from "@/lib/shortThemeChart";
import type { StockThemeMembershipAppV0 } from "@/types/stock.detail.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

function compareMetricsToReturns(
  compare: ThemeCompareReturnsV0 | undefined,
  themeName: string,
): Partial<Record<TreemapReturnColumn, number | null>> {
  const display = applyShortThemeCompareReturnsDisplay(compare, themeName);
  const m = display?.metrics;
  if (!m) return {};
  const out: Partial<Record<TreemapReturnColumn, number | null>> = {};
  for (const { key } of TREEMAP_RETURN_PERIODS) {
    const v = m[key];
    out[key] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

/**
 * Stock-page hero treemap: membership themes sized by weight in each theme,
 * colored by that theme’s returns (inverse of theme-page constituent map).
 */
export function buildStockThemeTreemapNodes(
  themes: StockThemeMembershipAppV0[] | undefined,
): ConstituentTreemapNode[] {
  if (!themes?.length) return [];
  const nodes: ConstituentTreemapNode[] = [];
  for (const t of themes) {
    const slug = String(t.slug || "").trim();
    const name = String(t.name || "").trim();
    const weight = typeof t.weight === "number" && Number.isFinite(t.weight) && t.weight > 0 ? t.weight : 0;
    if (!slug || !name || weight <= 0) continue;
    nodes.push({
      ticker: slug,
      name,
      weight,
      returns: compareMetricsToReturns(t.compare_returns, name),
    });
  }
  const total = nodes.reduce((s, n) => s + n.weight, 0);
  if (total <= 0) return [];
  return nodes
    .map((n) => ({ ...n, weight: (n.weight / total) * 100 }))
    .sort((a, b) => b.weight - a.weight);
}
