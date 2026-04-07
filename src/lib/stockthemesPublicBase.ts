import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";

/**
 * Derive public data base URL from the manifest URL, e.g.
 * https://storage.googleapis.com/stockthemes-public/manifest.json → .../stockthemes-public
 *
 * Set `NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL=` (empty) in `.env.local` to skip the public bucket
 * during static preview — avoids browser fetches to GCS when CORS is not configured for localhost.
 */
export function stockthemesPublicDataBase(): string | undefined {
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return undefined;
  }
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL;
  if (explicit !== undefined && explicit.trim() === "") {
    return undefined;
  }
  const raw = explicit?.trim() || STOCKTHEMES_DEFAULT_MANIFEST_URL;
  try {
    const u = new URL(raw);
    // Manifest URL may include cache-buster query params in dev; data-base derivation
    // must ignore those or downstream `${base}/home_trending.v0.json` becomes invalid.
    u.search = "";
    u.hash = "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return undefined;
    }
    parts.pop();
    u.pathname = `/${parts.join("/")}`;
    return u.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}
