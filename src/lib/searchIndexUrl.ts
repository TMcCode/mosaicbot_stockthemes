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
 * Absolute URL or same-origin path to search index JSON for browser `fetch`.
 * Mirrors manifest resolution: GCS base from manifest URL, else fixtures when no public base.
 */
export function searchIndexFetchUrl(): string {
  const override = process.env.NEXT_PUBLIC_STOCKTHEMES_SEARCH_INDEX_URL?.trim();
  if (override) {
    return override;
  }
  const base = stockthemesPublicDataBase();
  const prefix = clientBasePath();
  if (base) {
    return `${base}/${DEFAULT_OBJECT}`;
  }
  return `${prefix}${FIXTURE_PATH}`;
}
