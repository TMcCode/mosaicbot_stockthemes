import { STOCKTHEMES_CDN_ORIGIN } from "@/lib/stockthemesCdnOrigin";

/** Production static export: no browser live fetches when data is embedded at build. */
export function stockthemesLiveHydrationDisabled(): boolean {
  return process.env.NEXT_PUBLIC_STOCKTHEMES_DISABLE_LIVE_HYDRATE === "1";
}

/**
 * Block accidental direct GCS URLs during the R2 migration.
 */
export function normalizePublicDataBase(base: string | undefined): string | undefined {
  if (!base) return undefined;
  if (base.includes("storage.googleapis.com")) {
    return STOCKTHEMES_CDN_ORIGIN;
  }
  return base.replace(/\/$/, "");
}
