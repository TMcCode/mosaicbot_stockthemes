import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import { ThemesProgressiveList } from "@/components/ThemesProgressiveList";
import styles from "../page.module.css";
import { PageSurface } from "@/components/PageSurface";

import { getManifestCached } from "@/lib/getManifestCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "All themes",
  description: "Browse themes and stocks by theme.",
  path: "/themes",
});

export default async function ThemesPage() {
  const { manifest, source } = await getManifestCached();
  const label = source === "live" ? "live manifest" : "local fixture";
  const groupBySlug = new Map(manifest.groups.map((g) => [g.slug, g]));
  const themesSorted = [...manifest.themes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const themeRows = themesSorted.map((t) => ({
    slug: t.slug,
    name: t.name,
    groupName: t.group_slug ? `${groupBySlug.get(t.group_slug)?.name ?? "Group"}` : "",
    tickerCount: t.ticker_count ?? null,
  }));

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>Themes · {label}</p>
              <h1>All themes</h1>
              <p>{themesSorted.length} themes, sorted alphabetically.</p>
            </div>
            <AdPlacement
              placement="themesIndexRail"
              className={`${styles.adSlot} ${styles.groupsAdCompact}`}
              classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact}`}
              placeholderLabel="Ad Slot · Themes index"
              format="horizontal"
            />
          </div>
          <section className={styles.section}>
            <ThemesProgressiveList
              themes={themeRows}
              classNameList={styles.list}
              classNameListLink={styles.listLink}
              classNameName={styles.name}
              classNameMeta={styles.meta}
              classNameAdSlot={styles.adSlot}
              classNameAdChartEnd={styles.adChartEnd}
            />
          </section>
        </div>
      </main>
    </PageSurface>
  );
}
