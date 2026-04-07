import Link from "next/link";
import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import styles from "../page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";

export const metadata: Metadata = {
  title: "All groups",
  description: "Browse investment theme groups and constituent themes.",
};

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

  return (
    <div className={`st-surface ${styles.page}`}>
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
              className={`${styles.adSlot} ${styles.adSlotTall}`}
              placeholderLabel="Ad Slot · Groups index"
            />
          </div>
          <AdPlacement
            placement="groupsIndexStrip"
            className={`${styles.adSlot} ${styles.adChartEnd}`}
            classNameWhenActive={`${styles.adSlot} ${styles.adChartEnd}`}
            placeholderLabel="Ad Slot · Below intro"
            format="horizontal"
          />
          <section className={styles.section}>
            {orderedSectors.map((sector) => (
              <div key={`sector-${sector}`} className={styles.sectorBlock}>
                <h3 className={styles.sectorHeading}>{sector}</h3>
                <ul className={styles.groupThemeGrid} style={{ listStyle: "none", paddingLeft: 0 }}>
                  {(groupsBySector.get(sector) || []).map((g) => (
                    <li key={g.slug}>
                      <Link href={`/groups/${g.slug}`} className={styles.listLink} prefetch={false}>
                        <span className={styles.name}>{g.name}</span>
                        <span className={styles.meta}>
                          {g.theme_count != null ? `${g.theme_count} themes` : ""}
                          {g.theme_count != null && g.ticker_count != null ? " · " : ""}
                          {g.ticker_count != null ? `${g.ticker_count} tickers` : ""}
                        </span>
                        {g.blurb ? <span className={styles.groupBlurb}>{g.blurb}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
