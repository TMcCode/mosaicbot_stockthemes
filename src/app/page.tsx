import Link from "next/link";

import { AdPlacement } from "@/components/AdPlacement";
import { HomeHighlightedThemes } from "@/components/HomeHighlightedThemes";
import styles from "./page.module.css";

import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { computePerfFromChartPerformance } from "@/lib/computeThemePerf";
import { getHomeTrendingCached } from "@/lib/getHomeTrendingCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import { canUseHomeTrendingBundle } from "@/lib/homeTrendingBundle";
import {
  resolveTrendingColumnOrder,
  trendingColumnHeader,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export default async function Home() {
  const [{ manifest, source }, homeTrendingRes] = await Promise.all([
    getManifestCached(),
    getHomeTrendingCached(),
  ]);
  const stats = manifest.stats;
  const trendingNames = Array.isArray(manifest.trending_themes) ? manifest.trending_themes : [];
  const newThemeNames = Array.isArray(manifest.new_themes) ? manifest.new_themes : [];
  const updatedThemeNamesRaw = Array.isArray(manifest.updated_themes) ? manifest.updated_themes : [];
  // Prefer ETL-side dedupe; also filter here so old manifests / static embeds never show the same theme twice.
  const newNameSet = new Set(newThemeNames.map((n) => String(n).trim()));
  const updatedThemeNames = updatedThemeNamesRaw.filter((n) => !newNameSet.has(String(n).trim()));
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const updatedThemes = updatedThemeNames.map((name) => themeByName.get(name)).filter(Boolean);
  const homeBundle = homeTrendingRes?.bundle;
  const useHomeBundle = canUseHomeTrendingBundle(manifest, trendingNames, homeBundle ?? null);

  /** Preserve manifest order; include rows even when name is missing from manifest.themes */
  const details: {
    slug: string | null;
    name: string;
    chart1y: ThemeChart1yV0 | undefined;
    chartPerf: ChartPerfReturns;
    compare_returns?: ThemeCompareReturnsV0;
  }[] = useHomeBundle && homeBundle
    ? homeBundle.rows.map((row, i) => {
        const nameFromManifest = String(trendingNames[i] || "").trim();
        const t = nameFromManifest ? themeByName.get(nameFromManifest) : undefined;
        const slug = (row.slug ?? t?.slug ?? null) as string | null;
        const name = row.name || t?.name || nameFromManifest || "—";
        const chart1y = row.chart_1y ?? undefined;
        return {
          slug,
          name,
          chart1y,
          chartPerf: computePerfFromChartPerformance(chart1y?.performance),
          compare_returns: row.compare_returns ?? undefined,
        };
      })
    : await Promise.all(
        trendingNames.map(async (rawName) => {
          const name = String(rawName || "").trim();
          const t = name ? themeByName.get(name) : undefined;
          if (!t) {
            return {
              slug: null as string | null,
              name: name || "—",
              chart1y: undefined,
              chartPerf: {},
              compare_returns: undefined,
            };
          }
          const detailRes = await getThemeDetailCached(t.slug);
          const chartPerf = computePerfFromChartPerformance(detailRes?.detail?.chart_1y?.performance);
          return {
            slug: t.slug,
            name: t.name,
            chart1y: detailRes?.detail?.chart_1y,
            chartPerf,
            compare_returns: detailRes?.detail?.compare_returns,
          };
        }),
      );
  const detailsSorted = [...details].sort((a, b) => {
    const va = valueForTrendingColumn("10D", a.compare_returns, a.chartPerf);
    const vb = valueForTrendingColumn("10D", b.compare_returns, b.chartPerf);
    const aOk = va != null && Number.isFinite(va);
    const bOk = vb != null && Number.isFinite(vb);
    if (aOk && bOk) return vb - va;
    if (aOk) return -1;
    if (bOk) return 1;
    return 0;
  });
  const trendingColumns = resolveTrendingColumnOrder(detailsSorted);
  const eyebrow =
    source === "live"
      ? "stockthemes.ai · manifest v0 (live)"
      : "stockthemes.ai · manifest v0 (local fixture)";

  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>Thematic equity intelligence, organized for discovery</h1>
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
            <AdPlacement
              placement="hero"
              className={`${styles.adSlot} ${styles.adSlotTall}`}
              placeholderLabel="Ad Slot · Hero"
            />
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
              <div
                className={styles.trendingTable}
                style={{
                  gridTemplateColumns: `minmax(0, 1fr) repeat(${trendingColumns.length}, max-content)`,
                }}
              >
                <div className={styles.trendingHead}>Theme</div>
                {trendingColumns.map((col) => (
                  <div key={`h-${col}`} className={styles.trendingHead} title={col}>
                    {trendingColumnHeader(col)}
                  </div>
                ))}
                {detailsSorted.flatMap((row) => {
                  const keyBase = row.slug ?? `n-${row.name}`;
                  const nameCell =
                    row.slug != null ? (
                      <div key={`${keyBase}-name`} className={styles.trendingThemeCell}>
                        <Link
                          href={`/themes/${row.slug}`}
                          className={styles.trendingThemeName}
                          title={row.name}
                        >
                          {row.name}
                        </Link>
                      </div>
                    ) : (
                      <div key={`${keyBase}-name`} className={styles.trendingThemeCell}>
                        <span className={styles.trendingThemeNameMuted} title={row.name}>
                          {row.name}
                        </span>
                      </div>
                    );
                  const cells = trendingColumns.map((col) => {
                    const v = valueForTrendingColumn(col, row.compare_returns, row.chartPerf);
                    const style =
                      v != null && Number.isFinite(v) ? trendingReturnHeatStyle(v) : undefined;
                    return (
                      <div key={`${keyBase}-${col}`} className={styles.trendingValue} style={style}>
                        {fmtPct(v)}
                      </div>
                    );
                  });
                  return [nameCell, ...cells];
                })}
              </div>
            </section>

            <HomeHighlightedThemes
              items={detailsSorted
                .filter((d) => d.slug)
                .map((d) => ({
                  slug: d.slug as string,
                  name: d.name,
                  chart1y: d.chart1y,
                }))}
            />

            <section className={styles.section}>
              <h2>New and updated themes</h2>
              <h3 className={styles.sectorHeading}>New</h3>
              <div className={styles.chipList}>
                {newThemeNames.slice(0, 16).map((name) => {
                  const t = themeByName.get(name);
                  if (!t) return null;
                  return (
                    <Link key={`new-${t.slug}`} href={`/themes/${t.slug}`} className={styles.chip}>
                      {t.name}
                    </Link>
                  );
                })}
              </div>
              <h3 className={styles.sectorHeading}>Updated</h3>
              <div className={styles.chipList}>
                {updatedThemes.slice(0, 16).map((t) => (
                  <Link key={`upd-${t!.slug}`} href={`/themes/${t!.slug}`} className={styles.chipMuted}>
                    {t!.name}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
