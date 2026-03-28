import type { MetadataRoute } from "next";

import { loadManifest } from "@/lib/loadManifest";
import { siteBaseUrl } from "@/lib/siteUrl";

/** Required for `output: "export"` — sitemap is generated at build time from the manifest. */
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const { manifest } = await loadManifest();
  const lastModified = manifest.as_of ? new Date(manifest.as_of) : new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/groups`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/themes`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

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
