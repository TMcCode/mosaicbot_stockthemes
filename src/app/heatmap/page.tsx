import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { MarketHeatmapClient } from "@/components/MarketHeatmapClient";
import { PageSurface } from "@/components/PageSurface";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getEtfBenchmarksCached } from "@/lib/getEtfBenchmarksCached";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { getManifestCached } from "@/lib/getManifestCached";
import { buildHeatmapSectorSpdrReturns } from "@/lib/marketHeatmapSectors";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { catalogEyebrowText } from "@/lib/stockthemesBuildHints";

export const metadata: Metadata = buildPageMetadata({
  title: "Market heatmap",
  description:
    "Sector-grouped heatmap of every stockthemes.ai group and theme — sized by average constituent market cap, colored by return.",
  path: "/heatmap",
});

export default async function HeatmapPage() {
  const [{ manifest, source }, compareRes, benchmarksRes] = await Promise.all([
    getManifestCached(),
    getCompareThemesCached(),
    getEtfBenchmarksCached(),
  ]);

  const sectorSpdrReturns = buildHeatmapSectorSpdrReturns(benchmarksRes?.bundle);

  const asOfLabel = compareRes?.bundle.as_of
    ? formatSiteDataPublished(compareRes.bundle.as_of)
    : manifest.as_of
      ? formatSiteDataPublished(manifest.as_of)
      : null;

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <MarketHeatmapClient
            eyebrow={catalogEyebrowText("Market heatmap", source)}
            asOfLabel={asOfLabel}
            groups={manifest.groups ?? []}
            themes={manifest.themes ?? []}
            compareRows={compareRes?.bundle.rows ?? []}
            sectorSpdrReturns={sectorSpdrReturns}
          />
        </div>
      </main>
    </PageSurface>
  );
}
