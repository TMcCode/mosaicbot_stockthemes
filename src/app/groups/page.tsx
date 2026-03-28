import Link from "next/link";
import type { Metadata } from "next";

import styles from "../page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";

export const metadata: Metadata = {
  title: "All groups",
  description: "Browse investment theme groups and constituent themes.",
};

export default async function GroupsPage() {
  const { manifest, source } = await getManifestCached();
  const label = source === "live" ? "live manifest" : "local fixture";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Groups · {label}</p>
          <h1>All groups</h1>
          <p>
            {manifest.groups.length} groups · {manifest.stats?.total_themes ?? "—"} themes ·{" "}
            {manifest.stats?.total_tickers?.toLocaleString() ?? "—"} tickers
          </p>
          <section className={styles.section}>
            <ul className={styles.list} style={{ listStyle: "none", paddingLeft: 0 }}>
              {manifest.groups.map((g) => (
                <li key={g.slug}>
                  <Link href={`/groups/${g.slug}`} className={styles.name}>
                    {g.name}
                  </Link>
                  <span className={styles.meta}>
                    {" "}
                    <code className={styles.code}>{g.slug}</code>
                    {g.theme_count != null ? ` · ${g.theme_count} themes` : ""}
                    {g.ticker_count != null ? ` · ${g.ticker_count} tickers` : ""}
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
