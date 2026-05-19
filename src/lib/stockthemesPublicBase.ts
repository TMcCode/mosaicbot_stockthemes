import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";
import { stockthemesRevalidateSeconds } from "@/lib/stockthemesCache";
import { normalizePublicDataBase } from "@/lib/stockthemesClientConfig";

/**
 * Derive public data base URL from the manifest URL, e.g.
 * https://data.stockthemes.ai/manifest.json → https://data.stockthemes.ai (Path A CDN)
 *
 * Set `NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL=` (empty) in `.env.local` to skip the public bucket
 * during static preview — avoids browser fetches to GCS when CORS is not configured for localhost.
 */
export function stockthemesPublicDataBase(): string | undefined {
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return undefined;
  }
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim();
  // Only disable public origin for fixture-only builds (empty env alone should not break prod).
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1" && !explicit) {
    return undefined;
  }
  const raw = explicit || STOCKTHEMES_DEFAULT_MANIFEST_URL;
  try {
    const u = new URL(raw);
    // Manifest URL may include cache-buster query params in dev; data-base derivation
    // must ignore those or downstream `${base}/home_trending.v0.json` becomes invalid.
    u.search = "";
    u.hash = "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 1) {
      return undefined;
    }
    parts.pop();
    const pathPrefix = parts.length > 0 ? `/${parts.join("/")}` : "";
    return normalizePublicDataBase(`${u.origin}${pathPrefix}`.replace(/\/$/, ""));
  } catch {
    return undefined;
  }
}

/**
 * `fetch()` options for stockthemes public JSON (manifest, theme/group detail, bundles).
 * Development defaults to `no-store` so local reflects freshly published ETL JSON immediately.
 * Set `STOCKTHEMES_DEV_REVALIDATE_SEC` (e.g. `60`) to opt into cache for faster local reloads.
 */
export function stockthemesLiveFetchInit():
  | { cache: "no-store" }
  | { next: { revalidate: number } } {
  if (process.env.NODE_ENV === "development") {
    const devRevalidateRaw = process.env.STOCKTHEMES_DEV_REVALIDATE_SEC?.trim();
    if (devRevalidateRaw) {
      const seconds = Number(devRevalidateRaw);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return { next: { revalidate: Math.floor(seconds) } };
      }
    }
    return { cache: "no-store" };
  }
  return { next: { revalidate: stockthemesRevalidateSeconds() } };
}

