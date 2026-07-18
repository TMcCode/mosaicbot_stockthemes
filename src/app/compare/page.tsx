import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { ComparePageClient } from "@/components/ComparePageClient";
import { PageSurface } from "@/components/PageSurface";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
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
import {
  normalizeCompareColumnOrder,
  resolveTrendingColumnOrder,
} from "@/lib/trendingCompareMetrics";

export const metadata: Metadata = buildPageMetadata({
  title: "Theme returns table",
  description: "Compare all theme returns with multi-sort and filters.",
  path: "/compare",
});

function deriveYearTag(name: string): string | null {
  const m = String(name || "").match(/'(\d{2})\b/);
  return m ? m[1] : null;
}

export default async function ComparePage() {
  const [{ manifest, source }, compareRes, benchmarksRes, factorSpreadsRes, spyPerf] =
    await Promise.all([
      getManifestCached(),
      getCompareThemesCached(),
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
  const rows = (compareRes?.bundle.rows || []).map((r) => {
    const slug = String(r.slug || "").trim();
    const groupSlug = String(r.group_slug || "").trim();
    const groupMeta = groupSlug ? groupBySlug.get(groupSlug) : undefined;
    return {
      slug,
      name: String(r.name || "").trim(),
      groupSlug: r.group_slug ?? null,
      groupName:
        String(r.group_name || "").trim() || groupMeta?.name || "",
      spySector: groupMeta?.spySector ?? normalizeCompareSpySector(null),
    };
  });
  const fallbackColumns = resolveTrendingColumnOrder(
    (compareRes?.bundle.rows || []).map((r) => ({
      compare_returns: r.compare_returns ?? undefined,
    })),
  );
  const rawColumns =
    Array.isArray(compareRes?.bundle.columns) && compareRes?.bundle.columns.length
      ? compareRes.bundle.columns
      : fallbackColumns;
  const columns = normalizeCompareColumnOrder(rawColumns);
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
  const yearOptions = Array.from(
    new Set(rows.map((r) => deriveYearTag(r.name)).filter((x): x is string => Boolean(x))),
  ).sort();

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
            yearOptions={yearOptions}
            selectedDates={manifest.selected_dates}
          />
        </div>
      </main>
    </PageSurface>
  );
}
