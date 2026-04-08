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
