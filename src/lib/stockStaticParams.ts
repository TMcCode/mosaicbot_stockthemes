/**
 * Gates which `/stocks/[ticker]` HTML pages are pre-rendered / listed in sitemap.
 *
 * Default: fixtures only (avoids ~8k Pages until Contabo publishes the full stocks/ tree).
 * STOCKTHEMES_SYNC_STOCK_TICKERS=AAPL,0700.HK — allowlist (limited smoke).
 * STOCKTHEMES_SYNC_STOCKS=1 — all search_index tickers.
 */

export function stockTickerAllowlistFromEnv(): string[] {
  const raw = (
    process.env.STOCKTHEMES_SYNC_STOCK_TICKERS ||
    process.env.STOCKTHEMES_BUILD_STOCK_TICKERS ||
    ""
  ).trim();
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const t = part.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** True when full search_index universe should be baked (or an allowlist is set). */
export function stockStaticUniverseEnabled(): boolean {
  if (stockTickerAllowlistFromEnv().length > 0) return true;
  const raw = (process.env.STOCKTHEMES_SYNC_STOCKS || "0").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function mergeStockStaticTickers(
  searchIndexTickers: string[],
  fixtureTickers: string[],
): string[] {
  const allow = stockTickerAllowlistFromEnv();
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (t: string) => {
    const key = t.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };
  if (allow.length > 0) {
    for (const t of allow) push(t);
  } else if (stockStaticUniverseEnabled()) {
    for (const t of searchIndexTickers) push(t);
  }
  for (const t of fixtureTickers) push(t);
  return out.sort();
}
