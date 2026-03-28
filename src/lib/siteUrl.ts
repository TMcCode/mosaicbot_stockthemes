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
