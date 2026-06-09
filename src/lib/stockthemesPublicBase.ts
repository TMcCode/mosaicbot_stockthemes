import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";
import { stockthemesRevalidateSeconds } from "@/lib/stockthemesCache";
import { normalizePublicDataBase } from "@/lib/stockthemesClientConfig";

/**
 * Derive public data base URL from the manifest URL, e.g.
 * https://storage.stockthemes.ai/manifest.json → https://storage.stockthemes.ai
 *
 * Set `NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL=` (empty) in `.env.local` to skip the public bucket
 * during static preview — avoids browser fetches when CORS is not configured for localhost.
 */
/** Full offline build: all server loaders use public/fixtures (manifest, compare, trending, …). */
export function stockthemesServerUseFixtures(): boolean {
  return process.env.STOCKTHEMES_USE_FIXTURES === "1";
}

/**
 * Browser-only overlay ticker sidecars from fixtures while the rest of the site uses live CDN.
 * Does not affect SSR data loaders — set `STOCKTHEMES_USE_FIXTURES=1` for full offline instead.
 */
export function stockthemesBrowserOverlayFixtures(): boolean {
  return process.env.NEXT_PUBLIC_STOCKTHEMES_USE_FIXTURES === "1";
}

export function stockthemesPublicDataBase(): string | undefined {
  if (stockthemesServerUseFixtures()) {
    return undefined;
  }
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim();
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
 * Base URL for browser lazy chart sidecar fetches on /overlay.
 * Dev uses same-origin `/stockthemes-data` rewrite → storage.stockthemes.ai (any localhost port).
 */
export function stockthemesBrowserSidecarFetchBase(): string | undefined {
  const base = stockthemesPublicDataBase();
  if (!base) return undefined;
  if (process.env.NODE_ENV === "development") {
    return "/stockthemes-data";
  }
  return base;
}

/**
 * `fetch()` options for stockthemes public JSON (manifest, theme/group detail, bundles).
 * Development defaults to `no-store` so local reflects freshly published ETL JSON immediately.
 * Set `STOCKTHEMES_DEV_REVALIDATE_SEC` (e.g. `120`) for Next fetch revalidate; disk cache uses the same TTL
 * via `fetchPublicJsonText` in `stockthemesBuildCache.ts`. Use `STOCKTHEMES_DEV_NO_STORE=1` to skip disk cache.
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
    // Default 120s revalidate in dev (was no-store) — faster repeat navigations when disk cache misses.
    return { next: { revalidate: 120 } };
  }
  return { next: { revalidate: stockthemesRevalidateSeconds() } };
}
