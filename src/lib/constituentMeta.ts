import type { ChartCompositionSeriesV0 } from "@/types/chart.v0";
import type { GroupDetailChildThemeV0 } from "@/types/group.detail.v0";
import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

export type CompositionMeta = {
  name?: string;
  marketCapUsd?: number;
  /** Group composition legend: comma-separated tickers, optional `+N` suffix. */
  tickersPreview?: string;
};

function pickNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Human-readable USD market cap for constituent tables and tooltips. */
export function formatUsdMarketCap(v: number | undefined): string {
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

/** Descending by inferred USD market cap; missing or non-positive at end; tie-break by ticker. */
export function sortConstituentsByMarketCapDesc(
  constituents: ThemeDetailConstituentV0[],
): ThemeDetailConstituentV0[] {
  return [...constituents].sort((a, b) => {
    const nb = marketCapSortKey(inferMarketCapUsd(b));
    const na = marketCapSortKey(inferMarketCapUsd(a));
    if (nb !== na) return nb - na;
    return String(a.ticker || "").localeCompare(String(b.ticker || ""), undefined, {
      sensitivity: "base",
    });
  });
}

/** Align composition chart + legend: same ordering as constituents when meta includes marketCapUsd. */
export function sortCompositionSeriesByMarketCapDesc(
  series: ChartCompositionSeriesV0[] | undefined,
  metaByTicker: Record<string, CompositionMeta> | undefined,
): ChartCompositionSeriesV0[] {
  if (!series?.length) return [];
  return [...series].sort((a, b) => {
    const va = marketCapSortKey(metaByTicker?.[a.ticker.toUpperCase()]?.marketCapUsd);
    const vb = marketCapSortKey(metaByTicker?.[b.ticker.toUpperCase()]?.marketCapUsd);
    if (vb !== va) return vb - va;
    return a.ticker.localeCompare(b.ticker, undefined, { sensitivity: "base" });
  });
}

function formatTickersPreviewLine(t: GroupDetailChildThemeV0): string | undefined {
  const raw = t.tickers_preview;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const parts = raw.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  if (!parts.length) return undefined;
  const more = pickNumber(t.tickers_preview_more);
  const head = parts.join(", ");
  if (more != null && more > 0) return `${head} +${more}`;
  return head;
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
    out[t] = {
      name: c.name && String(c.name).trim() ? String(c.name).trim() : undefined,
      marketCapUsd: inferMarketCapUsd(c),
    };
  }
  return out;
}
