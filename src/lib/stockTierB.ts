/**
 * Tier B stock sidecars: private R2 → same-origin `/cdn-app/...` in the browser.
 * Build/SSR still reads warmed cache under the public data base path.
 */

export function stockTierBBrowserPath(ticker: string, suffix: string): string {
  return `/cdn-app/stocks/${encodeURIComponent(ticker)}${suffix}`;
}

/** Browser → gated `/cdn-app`. Node/SSR → `dataBaseUrl/stocks/...` (build cache). */
export function stockTierBUrl(dataBaseUrl: string, ticker: string, suffix: string): string {
  if (typeof window !== "undefined") {
    return stockTierBBrowserPath(ticker, suffix);
  }
  return `${dataBaseUrl.replace(/\/$/, "")}/stocks/${encodeURIComponent(ticker)}${suffix}`;
}
