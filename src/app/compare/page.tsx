import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { ComparePageClient } from "@/components/ComparePageClient";
import { PageSurface } from "@/components/PageSurface";
import { getEtfBenchmarksCached } from "@/lib/getEtfBenchmarksCached";
import { getFactorSpreadsCached } from "@/lib/getFactorSpreadsCached";
import {
  mapEtfBenchmarksToCompareRows,
  mapFactorSpreadsToCompareRows,
  type CompareBenchmarkRow,
} from "@/lib/compareBenchmarkRows";
import {
  normalizeCompareSpySector,
  orderCompareSectorOptions,
} from "@/lib/compareSectorFilter";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { catalogEyebrowText } from "@/lib/stockthemesBuildHints";
import { resolveCompareColumnOrder } from "@/lib/trendingCompareMetrics";

export const metadata: Metadata = buildPageMetadata({
  title: "Theme returns table",
  description: "Compare all theme returns with multi-sort and filters.",
  path: "/compare",
});

export default async function ComparePage() {
  // Identity from manifest only — metrics hydrate via client compare_themes fetch
  // (avoids shipping/parsing the ~1MB corpus in the RSC payload).
  // Top Picks loads client-side after paint (not on this critical path).
  const [{ manifest, source }, benchmarksRes, factorSpreadsRes, spyPerf] = await Promise.all([
    getManifestCached(),
    getEtfBenchmarksCached(),
    getFactorSpreadsCached(),
    getSpyMarketPerfCached(),
  ]);
  const groupBySlug = new Map(
    (manifest.groups || []).map((g) => {
      const slug = String(g.slug || "").trim();
      return [
        slug,
        {
          name: String(g.name || "").trim(),
          spySector: normalizeCompareSpySector(g.spy_sector),
        },
      ] as const;
    }),
  );
  const rows = (manifest.themes || []).map((t) => {
    const slug = String(t.slug || "").trim();
    const groupSlug = String(t.group_slug || "").trim();
    const groupMeta = groupSlug ? groupBySlug.get(groupSlug) : undefined;
    return {
      slug,
      name: String(t.name || "").trim(),
      groupSlug: t.group_slug ?? null,
      groupName: groupMeta?.name || "",
      spySector: groupMeta?.spySector ?? normalizeCompareSpySector(null),
      rank_visibility: t.rank_visibility ?? null,
      canonical_theme: t.canonical_theme ?? null,
    };
  });
  const columns = resolveCompareColumnOrder([], undefined);
  const benchmarkRows: CompareBenchmarkRow[] = (() => {
    const fromBundle = mapEtfBenchmarksToCompareRows(benchmarksRes?.bundle);
    if (fromBundle.length > 0) return fromBundle;
    if (spyPerf?.compareReturns) {
      return [
        {
          slug: "benchmark:SPY",
          name: "S&P 500 (SPY)",
          ticker: "SPY",
          marketBaseline: true,
          kind: "sector_etf" as const,
          compareReturns: spyPerf.compareReturns,
        },
      ];
    }
    return [];
  })();
  const factorSpreadRows = mapFactorSpreadsToCompareRows(factorSpreadsRes?.bundle);
  const groupSectorByName = new Map<string, string>();
  for (const r of rows) {
    const name = String(r.groupName || "").trim();
    if (!name || groupSectorByName.has(name)) continue;
    groupSectorByName.set(name, r.spySector);
  }
  const groupOptions = Array.from(groupSectorByName.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const sectorOptions = orderCompareSectorOptions(groupSectorByName.values());

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <ComparePageClient
            eyebrow={catalogEyebrowText("Theme returns table", source)}
            benchmarkRows={benchmarkRows}
            factorSpreadRows={factorSpreadRows}
            rows={rows}
            columns={columns}
            groupOptions={groupOptions}
            groupSectorByName={Object.fromEntries(groupSectorByName)}
            sectorOptions={sectorOptions}
            selectedDates={manifest.selected_dates}
          />
        </div>
      </main>
    </PageSurface>
  );
}
