/**
 * Canonical origin for sitemap, robots, and metadataBase.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://stockthemes.ai).
 */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return "https://stockthemes.ai";
}

/** Browser path for `public/` files when Next `basePath` is set (e.g. GitHub Pages project site). */
export function publicAssetPath(path: string): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  const prefix = !raw ? "" : raw.startsWith("/") ? raw : `/${raw}`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${p}`;
}

/**
 * Bump when replacing files under `public/brand/` so browsers/CDN do not keep
 * serving a prior mark for the full `/brand/*` cache TTL (see `public/_headers`).
 */
const BRAND_ASSET_VERSION = "20260806b";

/** `publicAssetPath` plus a stable query cache-buster for brand mark files. */
export function brandAssetPath(path: string): string {
  const base = publicAssetPath(path);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${BRAND_ASSET_VERSION}`;
}
