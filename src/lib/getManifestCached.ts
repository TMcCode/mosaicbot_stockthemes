import { cache } from "react";

import { loadManifest, type ManifestLoadResult } from "@/lib/loadManifest";

/** One fetch per request when multiple RSCs need the manifest. */
export const getManifestCached = cache(async (): Promise<ManifestLoadResult> => {
  return loadManifest();
});
