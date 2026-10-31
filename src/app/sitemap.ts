import type { MetadataRoute } from "next";

import { loadManifest } from "@/lib/loadManifest";
import { loadSearchIndex } from "@/lib/loadSearchIndex";
import { listStockFixtureTickers } from "@/lib/loadStockDetail";
import { SITEMAP_STATIC_PATHS } from "@/lib/sitemapStaticPages";
import { mergeStockStaticTickers } from "@/lib/stockStaticParams";
import { siteBaseUrl } from "@/lib/siteUrl";

/** Required for `output: "export"` — sitemap is generated at build time from the manifest. */
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const [{ manifest }, { index }] = await Promise.all([loadManifest(), loadSearchIndex()]);
  const lastModified = manifest.as_of ? new Date(manifest.as_of) : new Date();
  const stockLastModified = index.as_of ? new Date(index.as_of) : lastModified;

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

  // Sitemap lists the full search_index universe. HTML for the long tail is
  // on-demand (Pages Function → /stocks/__shell); only fixtures/allowlist are baked.
  const fixtureTickers = await listStockFixtureTickers();
  const fromIndex = (index.tickers || [])
    .map((row) => String(row.ticker || "").trim())
    .filter(Boolean);
  const stockTickers = mergeStockStaticTickers(fromIndex, fixtureTickers);
  // Always include every search_index ticker (on-demand pages), not only baked HTML.
  const sitemapTickers = Array.from(
    new Set([...fromIndex, ...stockTickers, ...fixtureTickers]),
  ).sort();
  for (const ticker of sitemapTickers) {
    entries.push({
      url: `${base}/stocks/${encodeURIComponent(ticker)}`,
      lastModified: stockLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
