import { cache } from "react";

import { getManifestCached } from "@/lib/getManifestCached";
import { loadManifestMeta, type ManifestMetaLoadResult } from "@/lib/loadManifestMeta";

/**
 * Layout footer ``as_of`` — prefer tiny ``manifest_meta.v0.json``, fall back to full manifest.
 * Soft-miss: do not spam R2/CDN retries when the sidecar is not published yet.
 */
export const getManifestMetaCached = cache(async (): Promise<ManifestMetaLoadResult> => {
  let lite: ManifestMetaLoadResult | null = null;
  try {
    lite = await loadManifestMeta();
  } catch {
    lite = null;
  }
  if (lite) return lite;
  const { manifest } = await getManifestCached();
  return {
    meta: {
      schema_version: 0,
      as_of: String(manifest.as_of || ""),
      build_id: manifest.build_id,
      ticker_performance_as_of: manifest.ticker_performance_as_of,
    },
    source: "missing",
  };
});
