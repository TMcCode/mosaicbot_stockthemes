import Link from "next/link";

import { HomeHighlightedThemes } from "@/components/HomeHighlightedThemes";
import styles from "./page.module.css";

import { getManifestCached } from "@/lib/getManifestCached";
import { loadThemeDetail } from "@/lib/loadThemeDetail";

function computePerf(values: number[]): { d1?: number; d10?: number; mtd?: number } {
  if (!Array.isArray(values) || values.length < 2) return {};
  const last = Number(values[values.length - 1]);
  const prev1 = Number(values[values.length - 2]);
  const prev10 = Number(values[Math.max(0, values.length - 11)]);
  const d1 = Number.isFinite(last) && Number.isFinite(prev1) && prev1 !== 0 ? ((last / prev1) - 1) * 100 : undefined;
  const d10 = Number.isFinite(last) && Number.isFinite(prev10) && prev10 !== 0 ? ((last / prev10) - 1) * 100 : undefined;
  const first = Number(values[0]);
  const mtd = Number.isFinite(last) && Number.isFinite(first) && first !== 0 ? ((last / first) - 1) * 100 : undefined;
  return { d1, d10, mtd };
}

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export default async function Home() {
  const { manifest, source } = await getManifestCached();
  const stats = manifest.stats;
  const trendingNames = Array.isArray(manifest.trending_themes) ? manifest.trending_themes : [];
  const newThemeNames = Array.isArray(manifest.new_themes) ? manifest.new_themes : [];
  const updatedThemeNames = Array.isArray(manifest.updated_themes) ? manifest.updated_themes : [];
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const trendingThemes = trendingNames.map((name) => themeByName.get(name)).filter(Boolean);
  const updatedThemes = updatedThemeNames.map((name) => themeByName.get(name)).filter(Boolean);
  const highlightedThemes = trendingThemes.slice(0, 6);
  const details = await Promise.all(
    highlightedThemes.map(async (t) => {
      const detailRes = await loadThemeDetail(t!.slug);
      const perfValues = detailRes?.detail?.chart_1y?.performance?.values || [];
      return {
        slug: t!.slug,
        name: t!.name,
        chart1y: detailRes?.detail?.chart_1y,
        perf: computePerf(perfValues),
      };
    }),
  );
  const eyebrow =
    source === "live"
      ? "stockthemes.ai · manifest v0 (live)"
      : "stockthemes.ai · manifest v0 (local fixture)";
  const updatedLabel = new Date(manifest.as_of).toLocaleString();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>Thematic equity intelligence, organized by momentum and narrative</h1>
              <div className={styles.introCopyWrap}>
                <p className={styles.introPunchline}>
                  Discover and track stock market narratives better than ever before
                </p>
                <p className={styles.introMore}>
                  <Link href="/about">Read about the methodology and background</Link>
                </p>
              </div>
              <div className={styles.ctas}>
                <Link className={styles.secondary} href="/themes">
                  Browse all themes
                </Link>
                <Link className={styles.primary} href="/groups">
                  Explore groups
                </Link>
              </div>
            </div>
            <aside className={`${styles.adSlot} ${styles.adSlotTall}`}>Ad Slot · Hero</aside>
          </div>

          {stats ? (
            <ul className={styles.statGrid}>
              {stats.total_tickers != null ? (
                <li className={styles.statCard}>
                  <strong>{stats.total_tickers.toLocaleString()}</strong>
                  <span>Public tickers tracked</span>
                </li>
              ) : null}
              {stats.total_groups != null ? (
                <li className={styles.statCard}>
                  <strong>{stats.total_groups}</strong>
                  <span>Theme groups</span>
                </li>
              ) : null}
              {stats.total_themes != null ? (
                <li className={styles.statCard}>
                  <strong>{stats.total_themes}</strong>
                  <span>Curated themes</span>
                </li>
              ) : null}
              <li className={styles.statCard}>
                <strong>
                  {stats.total_market_cap_usd != null
                    ? `$${(stats.total_market_cap_usd / 1e12).toFixed(1)}T`
                    : "—"}
                </strong>
                <span>Aggregate market cap (USD)</span>
              </li>
            </ul>
          ) : null}

          <div className={styles.directoryGrid}>
            <section className={styles.section}>
              <h2>Trending themes</h2>
              <div className={styles.trendingTable}>
                <div className={styles.trendingHead}>Theme</div>
                <div className={styles.trendingHead}>1D</div>
                <div className={styles.trendingHead}>10D</div>
                <div className={styles.trendingHead}>MTD</div>
                {details.flatMap((row) => [
                  <Link key={`${row.slug}-name`} href={`/themes/${row.slug}`} className={styles.trendingThemeName}>
                    {row.name}
                  </Link>,
                  <div key={`${row.slug}-d1`} className={styles.trendingValue}>
                    {fmtPct(row.perf.d1)}
                  </div>,
                  <div key={`${row.slug}-d10`} className={styles.trendingValue}>
                    {fmtPct(row.perf.d10)}
                  </div>,
                  <div key={`${row.slug}-mtd`} className={styles.trendingValue}>
                    {fmtPct(row.perf.mtd)}
                  </div>,
                ])}
              </div>
            </section>

            <section className={styles.section}>
              <h2>New and updated themes</h2>
              <h3 className={styles.sectorHeading}>New</h3>
              <div className={styles.chipList}>
                {newThemeNames.slice(0, 16).map((name) => {
                  const t = themeByName.get(name);
                  if (!t) return null;
                  return (
                    <Link key={`new-${t.slug}`} href={`/themes/${t.slug}`} className={styles.chip}>
                      New: {t.name}
                    </Link>
                  );
                })}
              </div>
              <h3 className={styles.sectorHeading}>Updated</h3>
              <div className={styles.chipList}>
                {updatedThemes.slice(0, 16).map((t) => (
                  <Link key={`upd-${t!.slug}`} href={`/themes/${t!.slug}`} className={styles.chipMuted}>
                    Updated: {t!.name}
                  </Link>
                ))}
              </div>
            </section>

            <HomeHighlightedThemes
              items={details.map((d) => ({
                slug: d.slug,
                name: d.name,
                chart1y: d.chart1y,
              }))}
            />
          </div>

          <p className={styles.updatedAt}>
            Updated <time dateTime={manifest.as_of}>{updatedLabel}</time>
          </p>
        </div>
      </main>
    </div>
  );
}
