import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

export type CompositionMeta = {
  name?: string;
  marketCapUsd?: number;
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
