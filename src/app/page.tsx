import Link from "next/link";

import styles from "./page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";

export default async function Home() {
  const { manifest, source } = await getManifestCached();
  const stats = manifest.stats;
  const eyebrow =
    source === "live"
      ? "stockthemes.ai · manifest v0 (live)"
      : "stockthemes.ai · manifest v0 (local fixture)";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>Theme &amp; group index</h1>
          <p>
            Data as of{" "}
            <time dateTime={manifest.as_of}>
              {new Date(manifest.as_of).toLocaleString()}
            </time>
            {manifest.build_id ? (
              <>
                {" "}
                · build <code className={styles.code}>{manifest.build_id}</code>
              </>
            ) : null}
          </p>
          {stats ? (
            <ul className={styles.stats}>
              {stats.total_tickers != null ? (
                <li>
                  <strong>{stats.total_tickers.toLocaleString()}</strong> tickers
                </li>
              ) : null}
              {stats.total_groups != null ? (
                <li>
                  <strong>{stats.total_groups}</strong> groups
                </li>
              ) : null}
              {stats.total_themes != null ? (
                <li>
                  <strong>{stats.total_themes}</strong> themes
                </li>
              ) : null}
              {stats.total_market_cap_usd != null ? (
                <li>
                  <strong>
                    ${(stats.total_market_cap_usd / 1e12).toFixed(1)}T
                  </strong>{" "}
                  mcap tracked (USD)
                </li>
              ) : null}
            </ul>
          ) : null}
          <div className={styles.ctas}>
            <Link className={styles.primary} href="/groups">
              All groups
            </Link>
            <Link className={styles.secondary} href="/themes">
              All themes
            </Link>
          </div>
          <section className={styles.section}>
            <h2>Groups ({manifest.groups.length})</h2>
            <ul className={styles.list}>
              {manifest.groups.map((g) => (
                <li key={g.slug}>
                  <span className={styles.name}>{g.name}</span>
                  <span className={styles.meta}>
                    {" "}
                    <code>{g.slug}</code>
                    {g.theme_count != null ? ` · ${g.theme_count} themes` : ""}
                    {g.ticker_count != null ? ` · ${g.ticker_count} tickers` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.section}>
            <h2>Themes ({manifest.themes.length})</h2>
            <ul className={styles.list}>
              {manifest.themes.map((t) => (
                <li key={t.slug}>
                  <span className={styles.name}>{t.name}</span>
                  <span className={styles.meta}>
                    {" "}
                    <code>{t.slug}</code>
                    {t.group_slug ? (
                      <>
                        {" "}
                        · group <code>{t.group_slug}</code>
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
