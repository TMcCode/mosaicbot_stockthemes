import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import { GroupsProgressiveSections } from "@/components/GroupsProgressiveSections";
import styles from "../page.module.css";
import { PageSurface } from "@/components/PageSurface";

import { getManifestCached } from "@/lib/getManifestCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "All groups",
  description: "Browse investment theme groups and constituent themes.",
  path: "/groups",
});

export default async function GroupsPage() {
  const { manifest, source } = await getManifestCached();
  const label = source === "live" ? "live manifest" : "local fixture";
  const sectorOrder = [
    "Communication Services",
    "Consumer Discretionary",
    "Consumer Staples",
    "Energy",
    "Financials",
    "Health Care",
    "Industrials",
    "Information Technology",
    "Materials",
    "Real Estate",
    "Utilities",
    "Macro",
    "Other",
  ];
  const groupsBySector = new Map<string, typeof manifest.groups>();
  for (const g of manifest.groups) {
    const sector = (g.spy_sector || "Other").trim() || "Other";
    if (!groupsBySector.has(sector)) groupsBySector.set(sector, []);
    groupsBySector.get(sector)!.push(g);
  }
  for (const [, rows] of groupsBySector) {
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }
  const orderedSectors = [
    ...sectorOrder.filter((s) => groupsBySector.has(s)),
    ...Array.from(groupsBySector.keys())
      .filter((s) => !sectorOrder.includes(s))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  ];

  const sectors = orderedSectors.map((sector) => ({
    sector,
    groups: (groupsBySector.get(sector) || []).map((g) => ({
      slug: g.slug,
      name: g.name,
      themeCount: g.theme_count ?? null,
      tickerCount: g.ticker_count ?? null,
      blurb: g.blurb ?? "",
    })),
  }));

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>Groups · {label}</p>
              <h1>All groups</h1>
              <p>
                {manifest.groups.length} groups · {manifest.stats?.total_themes ?? "—"} themes ·{" "}
                {manifest.stats?.total_tickers?.toLocaleString() ?? "—"} tickers
              </p>
            </div>
            <AdPlacement
              placement="groupsIndexRail"
              className={`${styles.adSlot} ${styles.groupsAdCompact}`}
              classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact}`}
              placeholderLabel="Ad Slot"
              format="horizontal"
            />
          </div>
          <section className={styles.section}>
            <GroupsProgressiveSections
              sectors={sectors}
              classNameSectorBlock={styles.sectorBlock}
              classNameSectorHeading={styles.sectorHeading}
              classNameGrid={styles.groupThemeGrid}
              classNameListLink={styles.listLink}
              classNameName={styles.name}
              classNameMeta={styles.meta}
              classNameGroupBlurb={styles.groupBlurb}
              classNameAdStrip={styles.adStrip}
              classNameAdStripBanner={styles.adStripBanner}
              classNameGroupsAdStrip={styles.groupsAdStrip}
            />
          </section>
        </div>
      </main>
    </PageSurface>
  );
}
