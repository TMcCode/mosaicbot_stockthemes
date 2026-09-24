/** Normalize radar / news ``tickers_preview`` (string[] or rich objects). */

export type RadarTickerPreview = {
  ticker: string;
  logoUrl?: string | null;
  companyName?: string | null;
};

export function normalizeRadarTickersPreview(
  raw: unknown,
  max = 6,
): RadarTickerPreview[] {
  if (!Array.isArray(raw) || max <= 0) return [];
  const out: RadarTickerPreview[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (out.length >= max) break;
    if (typeof item === "string") {
      const ticker = item.trim().toUpperCase();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      out.push({ ticker });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const ticker = String(row.ticker || "")
      .trim()
      .toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    const logoUrl =
      typeof row.logo_url === "string" && row.logo_url.trim()
        ? row.logo_url.trim()
        : typeof row.logoUrl === "string" && row.logoUrl.trim()
          ? row.logoUrl.trim()
          : null;
    const companyName =
      typeof row.company_name === "string" && row.company_name.trim()
        ? row.company_name.trim()
        : typeof row.companyName === "string" && row.companyName.trim()
          ? row.companyName.trim()
          : typeof row.name === "string" && row.name.trim()
            ? row.name.trim()
            : null;
    out.push({ ticker, logoUrl, companyName });
  }
  return out;
}

/** Collect tickers from radar/news card pools for slim company-name maps. */
export function collectRadarPreviewTickers(
  ...pools: Array<Array<{ tickers_preview?: unknown; siblings?: Array<{ tickers_preview?: unknown }> | null }> | null | undefined>
): Set<string> {
  const out = new Set<string>();
  for (const pool of pools) {
    if (!pool) continue;
    for (const card of pool) {
      for (const t of normalizeRadarTickersPreview(card.tickers_preview, 12)) {
        out.add(t.ticker);
      }
      for (const sib of card.siblings || []) {
        for (const t of normalizeRadarTickersPreview(sib.tickers_preview, 12)) {
          out.add(t.ticker);
        }
      }
    }
  }
  return out;
}
