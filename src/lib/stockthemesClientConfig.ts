import { STOCKTHEMES_CDN_ORIGIN } from "@/lib/stockthemesCdnOrigin";

/** Production static export: no browser live fetches when data is embedded at build. */
export function stockthemesLiveHydrationDisabled(): boolean {
  return process.env.NEXT_PUBLIC_STOCKTHEMES_DISABLE_LIVE_HYDRATE === "1";
}

/**
 * Client-side refresh of constituent price_returns from CDN (themes/<slug>.json).
 * On by default in production; set NEXT_PUBLIC_STOCKTHEMES_LIVE_PRICE_RETURNS=0 to disable.
 */
export function stockthemesLivePriceReturnsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_STOCKTHEMES_LIVE_PRICE_RETURNS === "0") {
    return false;
  }
  return process.env.NEXT_PUBLIC_STOCKTHEMES_LIVE_PRICE_RETURNS === "1" || process.env.NODE_ENV === "production";
}

/**
 * Block accidental direct GCS URLs during the R2 migration.
 */
export function normalizePublicDataBase(base: string | undefined): string | undefined {
  if (!base) return undefined;
  if (base.includes("storage.googleapis.com")) {
    return STOCKTHEMES_CDN_ORIGIN;
  }
  // Legacy Worker hostname — edge cache can lag R2; always use storage origin.
  if (base.includes("data.stockthemes.ai")) {
    return STOCKTHEMES_CDN_ORIGIN;
  }
  return base.replace(/\/$/, "");
}

/** Rewrite legacy `data.stockthemes.ai` manifest/bundle URLs to R2 custom domain. */
export function normalizePublicJsonUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const origin = normalizePublicDataBase(u.origin);
    if (!origin || origin === u.origin) {
      return trimmed;
    }
    return `${origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return trimmed;
  }
}
