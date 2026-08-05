import type { Metadata } from "next";
import { Suspense } from "react";

import styles from "@/app/page.module.css";
import { OverlayPageClient } from "@/components/OverlayPageClient";
import { PageSurface } from "@/components/PageSurface";
import { getEtfBenchmarksCached } from "@/lib/getEtfBenchmarksCached";
import { getFactorSpreadsCached } from "@/lib/getFactorSpreadsCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { mapOverlayFactorSpreadOptions } from "@/lib/overlayFactorSpreads";
import { mapOverlaySectorEtfCatalog } from "@/lib/overlaySectorEtfs";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { catalogEyebrowText } from "@/lib/stockthemesBuildHints";

export const metadata: Metadata = buildPageMetadata({
  title: "Theme compare chart",
  description:
    "Compare indexed performance for up to 12 themes, groups, tickers, sector SPDRs, or factor spreads on one chart.",
  path: "/overlay",
});

function OverlayFallback() {
  return <p className={styles.introPunchline}>Loading theme compare chart…</p>;
}

export default async function OverlayPage() {
  const [{ manifest, source }, spyPerf, benchmarksRes, factorSpreadsRes] = await Promise.all([
    getManifestCached(),
    getSpyMarketPerfCached(),
    getEtfBenchmarksCached(),
    getFactorSpreadsCached(),
  ]);
  const sectorEtfCatalog = mapOverlaySectorEtfCatalog(benchmarksRes?.bundle);
  const factorSpreadOptions = mapOverlayFactorSpreadOptions(factorSpreadsRes?.bundle);
  const selectedDates = Array.isArray(manifest.selected_dates) ? manifest.selected_dates : [];
  const groupLegendMetaBySlug = Object.fromEntries(
    (manifest.groups ?? []).map((g) => [
      g.slug,
      {
        spySector: g.spy_sector,
        themeCount: g.theme_count ?? g.theme_slugs?.length,
      },
    ]),
  );

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <Suspense fallback={<OverlayFallback />}>
            <OverlayPageClient
              eyebrow={catalogEyebrowText("Theme compare chart", source)}
              selectedDates={selectedDates}
              benchmarkPerformance={spyPerf?.benchmarkPerformance}
              groupLegendMetaBySlug={groupLegendMetaBySlug}
              sectorEtfCatalog={sectorEtfCatalog}
              factorSpreadOptions={factorSpreadOptions}
            />
          </Suspense>
        </div>
      </main>
    </PageSurface>
  );
}
