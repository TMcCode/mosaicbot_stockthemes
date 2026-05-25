/**
 * Derive public JSON base URL from a manifest URL.
 * https://storage.stockthemes.ai/manifest.json → https://storage.stockthemes.ai
 * https://legacy.example/stockthemes-public/manifest.json → https://legacy.example/stockthemes-public
 */
export function publicDataBaseFromManifest(manifest) {
  try {
    const u = new URL(manifest);
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
