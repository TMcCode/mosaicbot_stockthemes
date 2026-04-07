import Link from "next/link";
import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import styles from "../page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";

export const metadata: Metadata = {
  title: "All themes",
  description: "Browse themes and stocks by theme.",
};

/** Insert a horizontal strip after every N themes (first strip after items 1..N, before N+1). */
const THEMES_PER_STRIP_BLOCK = 50;

export default async function ThemesPage() {
  const { manifest, source } = await getManifestCached();
  const label = source === "live" ? "live manifest" : "local fixture";
  const groupBySlug = new Map(manifest.groups.map((g) => [g.slug, g]));
  const themesSorted = [...manifest.themes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  const sections: React.ReactNode[] = [];
  for (let start = 0; start < themesSorted.length; start += THEMES_PER_STRIP_BLOCK) {
    const slice = themesSorted.slice(start, start + THEMES_PER_STRIP_BLOCK);
    sections.push(
      <ul key={`themes-ul-${start}`} className={styles.list} style={{ listStyle: "none", paddingLeft: 0 }}>
        {slice.map((t) => (
          <li key={t.slug}>
            <Link href={`/themes/${t.slug}`} className={styles.listLink} prefetch={false}>
              <span className={styles.name}>{t.name}</span>
              <span className={styles.meta}>
                {t.group_slug ? `${groupBySlug.get(t.group_slug)?.name ?? "Group"}` : ""}
                {t.group_slug && t.ticker_count != null ? " · " : ""}
                {t.ticker_count != null ? `${t.ticker_count} tickers` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>,
    );
    if (start + THEMES_PER_STRIP_BLOCK < themesSorted.length) {
      sections.push(
        <AdPlacement
          key={`themes-strip-after-${start + THEMES_PER_STRIP_BLOCK}`}
          placement="themesIndexStrip"
          className={`${styles.adSlot} ${styles.adChartEnd}`}
          classNameWhenActive={`${styles.adSlot} ${styles.adChartEnd}`}
          placeholderLabel="Ad Slot · Every 50 themes"
          format="horizontal"
        />,
      );
    }
  }

  return (
    <div className={`st-surface ${styles.page}`}>
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
              className={`${styles.adSlot} ${styles.adSlotTall}`}
              placeholderLabel="Ad Slot · Themes index"
            />
          </div>
          <section className={styles.section}>{sections}</section>
        </div>
      </main>
    </div>
  );
}
