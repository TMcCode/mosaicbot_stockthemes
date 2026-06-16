/** Default ISR / browser cache bucket for public GCS JSON (seconds). */
const DEFAULT_REVALIDATE_SEC = 120 * 60;

/** Commentary live fetch window (seconds). Matches R2 object max-age (~300s). */
const DEFAULT_COMMENTARY_REVALIDATE_SEC = 300;

/**
 * Seconds before build-time Next fetch cache rolls (manifest, theme JSON at build).
 * Override with STOCKTHEMES_REVALIDATE_SEC or NEXT_PUBLIC_STOCKTHEMES_REVALIDATE_SEC.
 */
export function stockthemesRevalidateSeconds(): number {
  const raw =
    process.env.STOCKTHEMES_REVALIDATE_SEC?.trim() ||
    process.env.NEXT_PUBLIC_STOCKTHEMES_REVALIDATE_SEC?.trim() ||
    String(DEFAULT_REVALIDATE_SEC);
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds);
  }
  return DEFAULT_REVALIDATE_SEC;
}

/**
 * Query param for optional cache busting on client fetches to GCS.
 * Production: one bucket per revalidate window (reduces repeat egress).
 * Development: unique per request.
 */
export function stockthemesBrowserCacheBusterQuery(): string {
  if (process.env.NODE_ENV === "development") {
    return `ts=${Date.now()}`;
  }
  const windowMs = stockthemesRevalidateSeconds() * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `ts=${bucket}`;
}

/** Browser fetch cache mode for live GCS hydration (production allows HTTP cache). */
export function stockthemesBrowserFetchCache(): RequestCache {
  return process.env.NODE_ENV === "development" ? "no-store" : "default";
}

export function commentaryRevalidateSeconds(): number {
  const raw =
    process.env.NEXT_PUBLIC_STOCKTHEMES_COMMENTARY_REVALIDATE_SEC?.trim() ||
    String(DEFAULT_COMMENTARY_REVALIDATE_SEC);
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds);
  }
  return DEFAULT_COMMENTARY_REVALIDATE_SEC;
}

/** Time-bucket query for commentary-only client fetches (short window, low egress). */
export function commentaryBrowserCacheBusterQuery(): string {
  if (process.env.NODE_ENV === "development") {
    return `ts=${Date.now()}`;
  }
  const windowMs = commentaryRevalidateSeconds() * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `ts=${bucket}`;
}

export function commentaryBrowserFetchCache(): RequestCache {
  return process.env.NODE_ENV === "development" ? "no-store" : "default";
}

const DEFAULT_PRICE_REVALIDATE_SEC = 15 * 60;

/** Browser refresh window for live constituent price_returns (matches slim ETL cadence). */
export function priceReturnsRevalidateSeconds(): number {
  const raw =
    process.env.NEXT_PUBLIC_STOCKTHEMES_PRICE_REVALIDATE_SEC?.trim() ||
    String(DEFAULT_PRICE_REVALIDATE_SEC);
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 60) {
    return Math.floor(seconds);
  }
  return DEFAULT_PRICE_REVALIDATE_SEC;
}

export function priceReturnsBrowserCacheBusterQuery(): string {
  if (process.env.NODE_ENV === "development") {
    return `ts=${Date.now()}`;
  }
  const windowMs = priceReturnsRevalidateSeconds() * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `ts=${bucket}`;
}
