import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/stockthemesStorageConfig";

/**
 * Public R2 custom domain for stockthemes JSON.
 * Override with NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL if needed.
 */
export const STOCKTHEMES_CDN_ORIGIN = STOCKTHEMES_PUBLIC_BASE_URL;

export const STOCKTHEMES_CDN_MANIFEST_URL = `${STOCKTHEMES_CDN_ORIGIN}/manifest.json`;
