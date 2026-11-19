import type { StockThemeIndexV0 } from "@/types/stock.app.v0";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

/**
 * Stock page "Theme idx" / membership rows from LIVE theme returns.
 *
 * The ETL used to rewrite ~10k `stocks/<T>.app.v0.json` files every price tick just to
 * copy theme returns into each stock and pre-compute a weighted blend. Weights are static
 * (nightly) and theme returns already ship live in `compare_themes.v0.json`, so the browser
 * does the same math: overlay live theme rows, then blend by membership weight.
 *
 * Mirrors FetchEODData/stockthemes_manifest.py `_blend_theme_compare_returns_by_weight`
 * and `patch_stock_app_theme_metrics_price_only`.
 */

type ThemeWithCompare = {
  slug: string;
  weight?: number | null;
  compare_returns?: ThemeCompareReturnsV0 | null;
};

/** ThemeWgt percent points (15) or fixture fractions (0.15) → fraction. */
export function membershipWeightFraction(weight: unknown): number | null {
  if (weight == null || typeof weight === "boolean") return null;
  const w = typeof weight === "number" ? weight : Number(weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  return w > 1 ? w / 100 : w;
}

function hasMetrics(cr: ThemeCompareReturnsV0 | null | undefined): cr is ThemeCompareReturnsV0 {
  return Boolean(cr && cr.metrics && Object.keys(cr.metrics).length > 0);
}

/**
 * Replace each membership theme's `compare_returns` with the live compare-bundle row
 * (matched by slug, case-insensitive). Themes without a live row keep their value.
 */
export function overlayStockThemesWithLiveCompare<T extends ThemeWithCompare>(
  themes: T[],
  liveRows: Pick<CompareThemesRowV0, "slug" | "compare_returns">[] | null | undefined,
): T[] {
  if (!liveRows || liveRows.length === 0 || themes.length === 0) return themes;
  const bySlug = new Map<string, ThemeCompareReturnsV0>();
  for (const row of liveRows) {
    const slug = String(row.slug || "").trim().toUpperCase();
    if (slug && hasMetrics(row.compare_returns)) bySlug.set(slug, row.compare_returns);
  }
  if (bySlug.size === 0) return themes;
  let changed = false;
  const next = themes.map((t) => {
    const live = bySlug.get(String(t.slug || "").trim().toUpperCase());
    if (!live) return t;
    changed = true;
    return { ...t, compare_returns: live };
  });
  return changed ? next : themes;
}

/** Σ (w/Σw) × theme return, per horizon (Σw only over themes that have that horizon). */
export function blendThemeCompareReturnsByWeight(
  themes: ThemeWithCompare[],
): ThemeCompareReturnsV0 | null {
  const weighted = new Map<string, number>();
  const wsums = new Map<string, number>();
  const columnOrder: string[] = [];
  const seenColumn = new Set<string>();
  const noteColumn = (key: string) => {
    if (!seenColumn.has(key)) {
      seenColumn.add(key);
      columnOrder.push(key);
    }
  };
  for (const t of themes) {
    const w = membershipWeightFraction(t.weight);
    if (w == null) continue;
    const cr = t.compare_returns;
    const metrics = cr?.metrics;
    if (!metrics || typeof metrics !== "object") continue;
    for (const col of cr?.columns ?? []) {
      const key = String(col || "").trim();
      if (key) noteColumn(key);
    }
    for (const [col, raw] of Object.entries(metrics)) {
      const key = String(col || "").trim();
      if (!key || raw == null) continue;
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      noteColumn(key);
      weighted.set(key, (weighted.get(key) ?? 0) + w * v);
      wsums.set(key, (wsums.get(key) ?? 0) + w);
    }
  }
  const metricsOut: Record<string, number> = {};
  for (const [key, total] of weighted) {
    const den = wsums.get(key) ?? 0;
    if (den <= 0) continue;
    metricsOut[key] = Math.round((total / den) * 1e4) / 1e4;
  }
  const columns = columnOrder.filter((c) => c in metricsOut);
  if (columns.length === 0) return null;
  return {
    source: "membership_weight_blend::theme_compare_returns",
    metrics: Object.fromEntries(columns.map((c) => [c, metricsOut[c]])),
    columns,
  };
}

/**
 * Keep the nightly `theme_index.chart` / note; swap in the live weighted point-in-time row.
 * Returns the original index when no blend can be computed.
 */
export function withLiveThemeIndexCompare(
  themeIndex: StockThemeIndexV0 | null | undefined,
  themes: ThemeWithCompare[],
): StockThemeIndexV0 | null {
  const blend = blendThemeCompareReturnsByWeight(themes);
  if (!blend) return themeIndex ?? null;
  return {
    weights_basis: "current_membership",
    note:
      "Σ (membership weight / total weight) × theme return. " +
      "Chart holds current weights constant over theme history.",
    ...(themeIndex ?? {}),
    compare_returns: blend,
  };
}
