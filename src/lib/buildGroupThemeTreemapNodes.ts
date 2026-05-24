import {
  TREEMAP_RETURN_PERIODS,
  type ConstituentTreemapNode,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import type { GroupDetailThemeTreemapV0, GroupDetailThemeTreemapThemeV0 } from "@/types/group.detail.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

function compareMetricsToReturns(
  compare: ThemeCompareReturnsV0 | undefined,
): Partial<Record<TreemapReturnColumn, number | null>> {
  const m = compare?.metrics;
  if (!m) return {};
  const out: Partial<Record<TreemapReturnColumn, number | null>> = {};
  for (const { key } of TREEMAP_RETURN_PERIODS) {
    const v = m[key];
    out[key] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

function themeToNode(t: GroupDetailThemeTreemapThemeV0): ConstituentTreemapNode | null {
  const slug = String(t.slug || "").trim();
  const name = String(t.name || "").trim();
  const weight = typeof t.weight === "number" && t.weight > 0 ? t.weight : 0;
  if (!slug || !name || weight <= 0) return null;
  return {
    ticker: slug,
    name,
    weight,
    returns: compareMetricsToReturns(t.compare_returns ?? undefined),
  };
}

/** Equal-weight group treemap from ``groups/<slug>.json`` ``theme_treemap`` (Option B). */
export function buildGroupThemeTreemapNodes(
  treemap: GroupDetailThemeTreemapV0 | undefined,
): ConstituentTreemapNode[] {
  const themes = treemap?.themes;
  if (!Array.isArray(themes) || !themes.length) return [];
  const nodes = themes
    .map(themeToNode)
    .filter((n): n is ConstituentTreemapNode => n != null);
  const total = nodes.reduce((s, n) => s + n.weight, 0);
  if (total <= 0) return [];
  return nodes
    .map((n) => ({ ...n, weight: (n.weight / total) * 100 }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
