import { STOCKTHEMES_PUBLIC_BASE_URL } from "./storageConfig.mjs";

/** Legacy Worker hostname — edge cache can lag R2; scripts use storage origin. */
export function normalizePublicJsonUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "data.stockthemes.ai" || u.hostname.includes("storage.googleapis.com")) {
      return `${STOCKTHEMES_PUBLIC_BASE_URL}${u.pathname}${u.search}${u.hash}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Derive public JSON base URL from a manifest URL.
 * https://storage.stockthemes.ai/manifest.json → https://storage.stockthemes.ai
 * https://legacy.example/stockthemes-public/manifest.json → https://legacy.example/stockthemes-public
 */
export function publicDataBaseFromManifest(manifest) {
  try {
    const u = new URL(normalizePublicJsonUrl(manifest));
    u.search = "";
    u.hash = "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 1) {
      return null;
    }
    parts.pop();
    const pathPrefix = parts.length > 0 ? `/${parts.join("/")}` : "";
    return `${u.origin}${pathPrefix}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}
