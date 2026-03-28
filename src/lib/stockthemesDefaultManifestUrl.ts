/**
 * Canonical public bucket for stockthemes.ai JSON. Used when CI/local forgets to set
 * NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL so static export still gets a data base for hydration.
 */
export const STOCKTHEMES_DEFAULT_MANIFEST_URL =
  "https://storage.googleapis.com/stockthemes-public/manifest.json";
