import { cache } from "react";

import { buildThemeTickersPreviewMapFromGroups } from "@/lib/constituentMeta";
import { getGroupDetailCached } from "@/lib/getGroupDetailCached";
import { getManifestCached } from "@/lib/getManifestCached";

/** Theme slug → ticker preview line from existing `groups/<slug>.json` child themes. */
export const getGroupTickersPreviewMapCached = cache(async (): Promise<Map<string, string>> => {
  const { manifest } = await getManifestCached();
  const slugs = (manifest.groups || [])
    .map((g) => String(g.slug || "").trim())
    .filter(Boolean);
  const details = await Promise.all(slugs.map((slug) => getGroupDetailCached(slug)));
  return buildThemeTickersPreviewMapFromGroups(details.map((d) => d?.detail));
});
