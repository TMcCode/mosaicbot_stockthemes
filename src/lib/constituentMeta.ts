import type { ChartCompositionSeriesV0 } from "@/types/chart.v0";
import type { GroupDetailChildThemeV0 } from "@/types/group.detail.v0";
import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

export type CompositionMeta = {
  name?: string;
  marketCapUsd?: number;
  /** Manual theme weight (ThemeWgt); used to order composition legend. */
  weight?: number;
  /** Group composition legend: comma-separated tickers, optional `+N` suffix. */
  tickersPreview?: string;
};

function pickNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Human-readable USD market cap for constituent tables and tooltips. */
export function formatUsdMarketCap(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

export function inferMarketCapUsd(c: ThemeDetailConstituentV0): number | undefined {
  return (
    pickNumber(c.market_cap_usd) ??
    pickNumber(c.current_market_cap_usd) ??
    pickNumber(c.marketCapUsd) ??
    pickNumber(c.market_cap) ??
    pickNumber(c.current_market_cap) ??
    pickNumber(c.marketCap) ??
    pickNumber(c.mcap_usd) ??
    pickNumber(c.mcap) ??
    undefined
  );
}

function marketCapSortKey(usd: number | undefined): number {
  return usd != null && Number.isFinite(usd) && usd > 0 ? usd : -1;
}

function weightSortKey(weight: number | undefined): number {
  return weight != null && Number.isFinite(weight) && weight > 0 ? weight : -1;
}

function tickerTieBreak(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Descending by inferred USD market cap; missing or non-positive at end; tie-break by ticker. */
export function sortConstituentsByMarketCapDesc(
  constituents: ThemeDetailConstituentV0[],
): ThemeDetailConstituentV0[] {
  return [...constituents].sort((a, b) => {
    const nb = marketCapSortKey(inferMarketCapUsd(b));
    const na = marketCapSortKey(inferMarketCapUsd(a));
    if (nb !== na) return nb - na;
    return tickerTieBreak(String(a.ticker || ""), String(b.ticker || ""));
  });
}

/** Descending by manual weight, then market cap; missing/non-positive last; ticker tie-break. */
export function sortConstituentsByWeightDesc(
  constituents: ThemeDetailConstituentV0[],
): ThemeDetailConstituentV0[] {
  return [...constituents].sort((a, b) => {
    const wb = weightSortKey(pickNumber(b.weight));
    const wa = weightSortKey(pickNumber(a.weight));
    if (wb !== wa) return wb - wa;
    const nb = marketCapSortKey(inferMarketCapUsd(b));
    const na = marketCapSortKey(inferMarketCapUsd(a));
    if (nb !== na) return nb - na;
    return tickerTieBreak(String(a.ticker || ""), String(b.ticker || ""));
  });
}

/**
 * Theme composition legend: weight desc, then mcap desc.
 * Group composition: keep published series order (child themes); ticker chips come from ETL.
 */
export function sortCompositionSeriesByMarketCapDesc(
  series: ChartCompositionSeriesV0[] | undefined,
  metaByTicker: Record<string, CompositionMeta> | undefined,
): ChartCompositionSeriesV0[] {
  if (!series?.length) return [];
  const isGroupLegend = series.some((s) =>
    Boolean(metaByTicker?.[s.ticker.toUpperCase()]?.tickersPreview),
  );
  if (isGroupLegend) return [...series];
  return [...series].sort((a, b) => {
    const wa = weightSortKey(metaByTicker?.[a.ticker.toUpperCase()]?.weight);
    const wb = weightSortKey(metaByTicker?.[b.ticker.toUpperCase()]?.weight);
    if (wb !== wa) return wb - wa;
    const va = marketCapSortKey(metaByTicker?.[a.ticker.toUpperCase()]?.marketCapUsd);
    const vb = marketCapSortKey(metaByTicker?.[b.ticker.toUpperCase()]?.marketCapUsd);
    if (vb !== va) return vb - va;
    return tickerTieBreak(a.ticker, b.ticker);
  });
}

/** Max tickers shown before `+N` (group legend + compare subheader). */
export const TICKERS_PREVIEW_DISPLAY_MAX = 6;

/** Comma-separated tickers with optional `+N` suffix (group legend + compare table). */
export function formatTickersPreviewFromParts(
  tickers?: string[] | null,
  more?: number | null,
): string | undefined {
  if (!Array.isArray(tickers) || tickers.length === 0) return undefined;
  const parts = tickers.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  if (!parts.length) return undefined;
  const extra = pickNumber(more) ?? 0;
  const total = parts.length + extra;
  const shown = parts.slice(0, TICKERS_PREVIEW_DISPLAY_MAX);
  const head = shown.join(", ");
  const remaining = total - shown.length;
  if (remaining > 0) return `${head} +${remaining}`;
  return head;
}

/** Flatten `groups/*.json` child-theme previews (same source as group composition legend). */
export function buildThemeTickersPreviewMapFromGroups(
  groups: Array<{ themes?: GroupDetailChildThemeV0[] } | null | undefined>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const g of groups) {
    for (const t of g?.themes ?? []) {
      const slug = String(t.slug || "").trim();
      if (!slug || out.has(slug)) continue;
      const preview = formatTickersPreviewFromParts(t.tickers_preview, t.tickers_preview_more);
      if (preview) out.set(slug, preview);
    }
  }
  return out;
}

function formatTickersPreviewLine(t: GroupDetailChildThemeV0): string | undefined {
  return formatTickersPreviewFromParts(t.tickers_preview, t.tickers_preview_more);
}

/** Map theme slug → display name (+ optional ticker preview) for group composition chart legend. */
export function buildGroupThemeChartMetaMap(
  themes: GroupDetailChildThemeV0[] | undefined,
): Record<string, CompositionMeta> {
  const out: Record<string, CompositionMeta> = {};
  if (!themes?.length) return out;
  for (const t of themes) {
    const slug = String(t.slug || "").trim().toUpperCase();
    if (!slug) continue;
    const name = String(t.name || "").trim();
    const tickersPreview = formatTickersPreviewLine(t);
    const meta: CompositionMeta = {};
    if (name) meta.name = name;
    if (tickersPreview) meta.tickersPreview = tickersPreview;
    if (meta.name || meta.tickersPreview) out[slug] = meta;
  }
  return out;
}

export function buildCompositionMetaMap(
  constituents: ThemeDetailConstituentV0[] | undefined,
): Record<string, CompositionMeta> {
  const out: Record<string, CompositionMeta> = {};
  if (!constituents?.length) return out;
  for (const c of constituents) {
    const t = String(c.ticker || "").trim().toUpperCase();
    if (!t) continue;
    const weight = pickNumber(c.weight);
    out[t] = {
      name: c.name && String(c.name).trim() ? String(c.name).trim() : undefined,
      marketCapUsd: inferMarketCapUsd(c),
      ...(weight != null ? { weight } : {}),
    };
  }
  return out;
}
