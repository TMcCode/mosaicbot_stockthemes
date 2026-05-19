import { STOCKTHEMES_CDN_MANIFEST_URL } from "@/lib/stockthemesCdnOrigin";

/**
 * Default public manifest URL (Path A CDN). Override with NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL.
 * Direct GCS fallback for emergencies: https://storage.googleapis.com/stockthemes-public/manifest.json
 */
export const STOCKTHEMES_DEFAULT_MANIFEST_URL = STOCKTHEMES_CDN_MANIFEST_URL;

/** Direct GCS URL — avoid in production (bills egress); use for debugging only. */
export const STOCKTHEMES_GCS_MANIFEST_URL =
  "https://storage.googleapis.com/stockthemes-public/manifest.json";
