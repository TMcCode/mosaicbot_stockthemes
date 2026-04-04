import Link from "next/link";
import type { Metadata } from "next";

import styles from "../page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";

export const metadata: Metadata = {
  title: "All themes",
  description: "Browse themes and stocks by theme.",
};

export default async function ThemesPage() {
  const { manifest, source } = await getManifestCached();
  const label = source === "live" ? "live manifest" : "local fixture";
  const groupBySlug = new Map(manifest.groups.map((g) => [g.slug, g]));
  const themesSorted = [...manifest.themes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

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
            <aside className={styles.adSlot}>Ad Slot · Themes</aside>
          </div>
          <section className={styles.section}>
            <ul className={styles.list} style={{ listStyle: "none", paddingLeft: 0 }}>
              {themesSorted.map((t) => (
                <li key={t.slug}>
                  <Link href={`/themes/${t.slug}`} className={styles.listLink}>
                    <span className={styles.name}>{t.name}</span>
                    <span className={styles.meta}>
                      {t.group_slug ? `${groupBySlug.get(t.group_slug)?.name ?? "Group"}` : ""}
                      {t.group_slug && t.ticker_count != null ? " · " : ""}
                      {t.ticker_count != null ? `${t.ticker_count} tickers` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
