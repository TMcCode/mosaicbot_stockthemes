import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

const FIXTURE_PATH = "/fixtures/search_index.v0.json";
const DEFAULT_OBJECT = "search_index.v0.json";

function clientBasePath(): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    return "";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Ordered URLs for browser `fetch`: same-origin file first (written at build by
 * `scripts/fetch-search-index.mjs`), then upstream GCS if the bundle is missing or stale locally.
 */
export function searchIndexFetchUrls(): string[] {
  const override = process.env.NEXT_PUBLIC_STOCKTHEMES_SEARCH_INDEX_URL?.trim();
  if (override) {
    return [override];
  }
  const base = stockthemesPublicDataBase();
  const prefix = clientBasePath();
  if (!base) {
    return [`${prefix}${FIXTURE_PATH}`];
  }
  const sameOrigin = `${prefix}/${DEFAULT_OBJECT}`.replace(/\/+/g, "/");
  const upstream = `${base}/${DEFAULT_OBJECT}`;
  // In dev, a leftover `public/search_index.v0.json` (from an old prebuild) is often older than
  // live manifest/home_feed. Prefer the bucket first; fall back to same-origin if CORS/network fails.
  if (process.env.NODE_ENV === "development") {
    return [upstream, sameOrigin];
  }
  return [sameOrigin, upstream];
}

/**
 * @deprecated Prefer {@link searchIndexFetchUrls} for fallback behavior.
 */
export function searchIndexFetchUrl(): string {
  return searchIndexFetchUrls()[0] ?? `${clientBasePath()}${FIXTURE_PATH}`;
}
