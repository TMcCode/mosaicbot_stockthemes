import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";

const CACHE_FILE = "manifest_meta.v0.json";

export type ManifestMetaV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  ticker_performance_as_of?: string;
};

export type ManifestMetaLoadResult = {
  meta: ManifestMetaV0;
  source: "live" | "missing";
};

/**
 * Tiny footer/nav payload — avoids parsing full ``manifest.json`` (~1MB) in layout.
 * In ``next dev``, only reads disk cache (no R2/CDN probe) so an unpublished
 * sidecar cannot add multi-second 404 retries on every navigation.
 */
export async function loadManifestMeta(): Promise<ManifestMetaLoadResult | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  try {
    const raw = await fetchPublicJsonText(
      `${base.replace(/\/$/, "")}/${CACHE_FILE}`,
      CACHE_FILE,
      process.env.NODE_ENV === "development" ? { diskOnly: true } : undefined,
    );
    const data = parseJsonPayload<ManifestMetaV0>(raw);
    if (data.schema_version !== 0) return null;
    if (!String(data.as_of || "").trim()) return null;
    return { meta: data, source: "live" };
  } catch {
    return null;
  }
}
