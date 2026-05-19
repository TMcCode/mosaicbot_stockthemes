import { STOCKTHEMES_CDN_ORIGIN } from "@/lib/stockthemesCdnOrigin";

/** Production static export: no browser fetches to GCS/CDN (data is embedded at build). */
export function stockthemesLiveHydrationDisabled(): boolean {
  return process.env.NEXT_PUBLIC_STOCKTHEMES_DISABLE_LIVE_HYDRATE === "1";
}

/**
 * Block accidental direct GCS URLs in production (bills egress, bypasses CDN).
 * Set NEXT_PUBLIC_STOCKTHEMES_ALLOW_DIRECT_GCS=1 only for local debugging.
 */
export function normalizePublicDataBase(base: string | undefined): string | undefined {
  if (!base) return undefined;
  if (process.env.NEXT_PUBLIC_STOCKTHEMES_ALLOW_DIRECT_GCS === "1") {
    return base.replace(/\/$/, "");
  }
  if (base.includes("storage.googleapis.com")) {
    return STOCKTHEMES_CDN_ORIGIN;
  }
  return base.replace(/\/$/, "");
}
