/**
 * Tier B theme sidecars: private R2 → same-origin `/cdn-app/...` in the browser.
 * Build/SSR still reads warmed cache under the public data base path.
 */

export function themeTierBBrowserPath(slug: string, suffix: string): string {
  return `/cdn-app/themes/${encodeURIComponent(slug)}${suffix}`;
}

/** Browser → gated `/cdn-app`. Node/SSR → `dataBaseUrl/themes/...` (build cache). */
export function themeTierBUrl(dataBaseUrl: string, slug: string, suffix: string): string {
  if (typeof window !== "undefined") {
    return themeTierBBrowserPath(slug, suffix);
  }
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${suffix}`;
}
