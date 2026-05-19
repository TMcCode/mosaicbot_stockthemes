/**
 * Path A CDN origin for public stockthemes JSON (Cloudflare Worker → GCS).
 * Override with NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL if needed.
 */
export const STOCKTHEMES_CDN_ORIGIN = "https://data.stockthemes.ai";

export const STOCKTHEMES_CDN_MANIFEST_URL = `${STOCKTHEMES_CDN_ORIGIN}/manifest.json`;
