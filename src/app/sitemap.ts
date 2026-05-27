import type { MetadataRoute } from "next";

import { loadManifest } from "@/lib/loadManifest";
import { SITEMAP_STATIC_PATHS } from "@/lib/sitemapStaticPages";
import { siteBaseUrl } from "@/lib/siteUrl";

/** Required for `output: "export"` — sitemap is generated at build time from the manifest. */
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const { manifest } = await loadManifest();
  const lastModified = manifest.as_of ? new Date(manifest.as_of) : new Date();

  const entries: MetadataRoute.Sitemap = SITEMAP_STATIC_PATHS.map((p) => ({
    url: `${base}${p.path === "/" ? "" : p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  for (const g of manifest.groups) {
    entries.push({
      url: `${base}/groups/${encodeURIComponent(g.slug)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const t of manifest.themes) {
    entries.push({
      url: `${base}/themes/${encodeURIComponent(t.slug)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
