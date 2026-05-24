import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { ComparePageClient } from "@/components/ComparePageClient";
import { PageSurface } from "@/components/PageSurface";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { catalogEyebrowText } from "@/lib/stockthemesBuildHints";
import {
  normalizeCompareColumnOrder,
  resolveTrendingColumnOrder,
} from "@/lib/trendingCompareMetrics";

export const metadata: Metadata = buildPageMetadata({
  title: "Compare themes",
  description: "Compare all theme returns with multi-sort and filters.",
  path: "/compare",
});

function deriveYearTag(name: string): string | null {
  const m = String(name || "").match(/'(\d{2})\b/);
  return m ? m[1] : null;
}

export default async function ComparePage() {
  const [{ manifest, source }, compareRes] = await Promise.all([
    getManifestCached(),
    getCompareThemesCached(),
  ]);
  const groupBySlug = new Map(
    (manifest.groups || []).map((g) => [String(g.slug || "").trim(), String(g.name || "").trim()]),
  );
  const rows = (compareRes?.bundle.rows || []).map((r) => ({
    slug: String(r.slug || "").trim(),
    name: String(r.name || "").trim(),
    groupSlug: r.group_slug ?? null,
    groupName:
      String(r.group_name || "").trim() ||
      (r.group_slug ? (groupBySlug.get(String(r.group_slug || "").trim()) ?? "") : ""),
    compareReturns: r.compare_returns ?? undefined,
  }));
  const fallbackColumns = resolveTrendingColumnOrder(
    rows.map((r) => ({ compare_returns: r.compareReturns })),
  );
  const rawColumns =
    Array.isArray(compareRes?.bundle.columns) && compareRes?.bundle.columns.length
      ? compareRes.bundle.columns
      : fallbackColumns;
  const columns = normalizeCompareColumnOrder(rawColumns);
  const groupOptions = Array.from(
    new Set(rows.map((r) => String(r.groupName || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const yearOptions = Array.from(
    new Set(rows.map((r) => deriveYearTag(r.name)).filter((x): x is string => Boolean(x))),
  ).sort();

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <ComparePageClient
            eyebrow={catalogEyebrowText("Compare", source)}
            rows={rows}
            columns={columns}
            groupOptions={groupOptions}
            yearOptions={yearOptions}
          />
        </div>
      </main>
    </PageSurface>
  );
}
