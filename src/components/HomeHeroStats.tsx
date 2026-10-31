import Link from "next/link";

import { HomeDataAsOfLive } from "@/components/HomeDataAsOfLive";
import { getManifestCached } from "@/lib/getManifestCached";

import styles from "@/app/page.module.css";

/** Async stats rail — desktop only via CSS; kept off the sync hero path. */
export async function HomeHeroStats() {
  const { manifest } = await getManifestCached();
  const stats = manifest.stats;
  if (!stats) return null;

  return (
    <ul className={styles.statGridHero} aria-label="Site coverage stats">
      {stats.total_tickers != null ? (
        <li className={`${styles.statCard} ${styles.statTickers}`}>
          <span>Public tickers tracked</span>
          <strong>{stats.total_tickers.toLocaleString()}</strong>
        </li>
      ) : null}
      {stats.total_groups != null ? (
        <li className={`${styles.statCard} ${styles.statGroups} ${styles.statCardClickable}`}>
          <Link href="/groups" className={styles.statCardHit}>
            <span>Theme groups</span>
            <strong>{stats.total_groups}</strong>
          </Link>
        </li>
      ) : null}
      {stats.total_themes != null ? (
        <li className={`${styles.statCard} ${styles.statThemes} ${styles.statCardClickable}`}>
          <Link href="/themes" className={styles.statCardHit}>
            <span>Curated themes</span>
            <strong>{stats.total_themes}</strong>
          </Link>
        </li>
      ) : null}
      {manifest.as_of ? (
        <HomeDataAsOfLive
          serverAsOf={manifest.as_of}
          serverTickerPerformanceAsOf={manifest.ticker_performance_as_of}
        />
      ) : null}
    </ul>
  );
}
