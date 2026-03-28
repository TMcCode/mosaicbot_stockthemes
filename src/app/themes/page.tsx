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
  const themesSorted = [...manifest.themes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Themes · {label}</p>
          <h1>All themes</h1>
          <p>{themesSorted.length} themes (alphabetical by name)</p>
          <section className={styles.section}>
            <ul className={styles.list} style={{ listStyle: "none", paddingLeft: 0 }}>
              {themesSorted.map((t) => (
                <li key={t.slug}>
                  <Link href={`/themes/${t.slug}`} className={styles.name}>
                    {t.name}
                  </Link>
                  <span className={styles.meta}>
                    {" "}
                    <code className={styles.code}>{t.slug}</code>
                    {t.group_slug ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link href={`/groups/${t.group_slug}`} style={{ fontWeight: 500 }}>
                          {t.group_slug}
                        </Link>
                      </>
                    ) : null}
                    {t.ticker_count != null ? ` · ${t.ticker_count} tickers` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
