import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";

/**
 * Derive public data base URL from the manifest URL, e.g.
 * https://storage.googleapis.com/stockthemes-public/manifest.json → .../stockthemes-public
 */
export function stockthemesPublicDataBase(): string | undefined {
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return undefined;
  }
  const raw =
    process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim() ||
    STOCKTHEMES_DEFAULT_MANIFEST_URL;
  try {
    const u = new URL(raw);
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
