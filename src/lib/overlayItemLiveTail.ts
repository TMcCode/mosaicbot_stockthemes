import type { CompareGroupsV0 } from "@/types/compare_groups.v0";
import type { CompareThemesV0 } from "@/types/compare_themes.v0";
import type { SearchIndexV0 } from "@/types/search_index.v0";
import type { ThemePriceReturnsSidecarV0 } from "@/types/theme.price_returns.v0";

function overlayKey(kind: "theme" | "group" | "ticker", slug: string): string {
  const normalized = kind === "ticker" ? slug.trim().toUpperCase() : slug.trim();
  return `${kind}:${normalized}`;
}

function dayReturnPctFromMetrics(
  metrics: Record<string, number | null | undefined> | undefined,
): number | null {
  const raw = metrics?.["1D"];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

/** Map overlay item keys (`theme:slug` / `group:slug`) → live 1D % from compare bundles. */
export function dayReturnPctByOverlayKeyFromCompareBundles(
  themes: CompareThemesV0 | null | undefined,
  groups: CompareGroupsV0 | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of themes?.rows ?? []) {
    const slug = String(row.slug || "").trim();
    const dayReturnPct = dayReturnPctFromMetrics(row.compare_returns?.metrics);
    if (!slug || dayReturnPct == null) continue;
    out[overlayKey("theme", slug)] = dayReturnPct;
  }
  for (const row of groups?.rows ?? []) {
    const slug = String(row.slug || "").trim();
    const dayReturnPct = dayReturnPctFromMetrics(row.compare_returns?.metrics);
    if (!slug || dayReturnPct == null) continue;
    out[overlayKey("group", slug)] = dayReturnPct;
  }
  return out;
}

/** First theme slug that lists this ticker in the search index (for price_returns lookup). */
export function primaryThemeSlugForTicker(
  index: SearchIndexV0 | null | undefined,
  ticker: string,
): string | null {
  const sym = String(ticker || "").trim().toUpperCase();
  if (!sym || !index?.tickers?.length) return null;
  for (const row of index.tickers) {
    if (String(row.ticker || "").trim().toUpperCase() !== sym) continue;
    for (const slug of row.theme_slugs ?? []) {
      const s = String(slug || "").trim();
      if (s) return s;
    }
  }
  return null;
}

/** Constituent 1D % from a theme price_returns sidecar. */
export function dayReturnPctForTickerFromPriceReturnsSidecar(
  sidecar: ThemePriceReturnsSidecarV0 | null | undefined,
  ticker: string,
): number | null {
  const sym = String(ticker || "").trim().toUpperCase();
  if (!sym || !sidecar?.constituents?.length) return null;
  for (const row of sidecar.constituents) {
    if (String(row.ticker || "").trim().toUpperCase() !== sym) continue;
    return dayReturnPctFromMetrics(row.price_returns?.metrics);
  }
  return null;
}

export function parseCompareGroupsJson(raw: unknown): CompareGroupsV0 | null {
  if (!raw || typeof raw !== "object") return null;
  const bundle = raw as Partial<CompareGroupsV0>;
  if (bundle.schema_version !== 0 || !Array.isArray(bundle.rows)) return null;
  return bundle as CompareGroupsV0;
}
