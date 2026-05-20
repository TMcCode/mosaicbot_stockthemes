import { parseJsonPayload } from "@/lib/parseJsonPayload";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { STOCKTHEMES_DEFAULT_MANIFEST_URL } from "@/lib/stockthemesDefaultManifestUrl";
import type { ManifestSelectedDateV0, ManifestV0 } from "@/types/manifest.v0";

export type ManifestClientSnapshot = {
  selected_dates: ManifestSelectedDateV0[];
};

function parseManifest(raw: string): ManifestClientSnapshot {
  const data = parseJsonPayload<ManifestV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported manifest schema_version: ${data.schema_version}`);
  }
  return {
    selected_dates: Array.isArray(data.selected_dates) ? data.selected_dates : [],
  };
}

export async function fetchManifestClient(): Promise<ManifestClientSnapshot | null> {
  const explicit = process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim();
  const url = `${explicit || STOCKTHEMES_DEFAULT_MANIFEST_URL}?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, { cache: stockthemesBrowserFetchCache() });
  if (!res.ok) return null;
  const raw = await res.text();
  return parseManifest(raw);
}
