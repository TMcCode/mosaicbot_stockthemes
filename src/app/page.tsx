import Link from "next/link";
import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import { DeferRender } from "@/components/DeferRender";
import { HomeCommentaryPreview } from "@/components/HomeCommentaryPreview";
import { HomeHighlightedThemes } from "@/components/HomeHighlightedThemes";
import { HomePublisherIntro } from "@/components/HomePublisherIntro";
import { HomeTopMoversTicker } from "@/components/HomeTopMoversTicker";
import { HomeWatchlistCtaLink } from "@/components/HomeWatchlistCtaLink";
import { HomeTrendingThemesTable } from "@/components/HomeTrendingThemesTable";
import { PageSurface } from "@/components/PageSurface";
import styles from "./page.module.css";

import type { ChartPerfReturns } from "@/lib/computeThemePerf";
import { computePerfFromChartPerformance } from "@/lib/computeThemePerf";
import { buildTopMoversTickerItems } from "@/lib/buildTopMoversTicker";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getHomeTrendingCached } from "@/lib/getHomeTrendingCached";
import { buildHomePageJsonLd } from "@/lib/homePageJsonLd";
import { homeSiteJsonDescription } from "@/lib/homeSiteCopy";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import { canUseHomeTrendingBundle } from "@/lib/homeTrendingBundle";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { homeEyebrowText } from "@/lib/stockthemesBuildHints";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { resolveTrendingColumnOrder, valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import { mergeHomeFeedEvents, prioritizeLifecycleHomeFeed } from "@/lib/mergeHomeFeedEvents";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

function fmtFeedDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function normalizeEventKey(value: string): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function cleanFeedTitle(evt: ManifestHomeFeedEventV0): string {
  const title = String(evt.title || "").trim();
  if (evt.kind === "theme_new" && title.toLowerCase().endsWith(" - new theme")) {
    return title.slice(0, -(" - new theme".length));
  }
  if (evt.kind === "theme_updated" && title.toLowerCase().endsWith(" - theme updated")) {
    return title.slice(0, -(" - theme updated".length));
  }
  if (evt.kind === "theme_weights_updated" && title.toLowerCase().endsWith(" - theme weights updated")) {
    return title.slice(0, -(" - theme weights updated".length));
  }
  return title;
}

function feedChangesText(evt: ManifestHomeFeedEventV0): string {
  const raw = Array.isArray(evt.changes_preview)
    ? evt.changes_preview.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const more = Number.isFinite(evt.changes_more_count) ? Number(evt.changes_more_count) : 0;
  if (!raw.length && more <= 0) return "";

  const added: string[] = [];
  const removed: string[] = [];
  const other: string[] = [];
  for (const item of raw) {
    const m = item.match(/^(.+?)\s+(added|removed)$/i);
    if (!m) {
      other.push(item);
      continue;
    }
    const ticker = String(m[1] || "").trim();
    const action = String(m[2] || "").toLowerCase();
    if (!ticker) continue;
    if (action === "added") added.push(ticker);
    else if (action === "removed") removed.push(ticker);
    else other.push(item);
  }

  const parts: string[] = [];
  if (removed.length) parts.push(`${removed.join(", ")} removed`);
  if (added.length) parts.push(`${added.join(", ")} added`);
  if (other.length) parts.push(other.join(", "));

  if (more > 0) {
    if (added.length && !removed.length) {
      parts.push(`+${more} more added`);
    } else if (removed.length && !added.length) {
      parts.push(`+${more} more removed`);
    } else {
      parts.push(`+${more} more changes`);
    }
  }
  return parts.join("; ");
}

/** Homepage Feed strip: at most this many rows, each within the last `HOME_FEED_MAX_DAYS` days. */
const HOME_FEED_RENDER_LIMIT = 5;
const HOME_FEED_MAX_DAYS = 10;

export const metadata: Metadata = buildPageMetadata({
  title: "stockthemes.ai",
  description:
    "Curated thematic equity research: hand-built theme baskets, group discovery, performance tables, and methodology-backed limitations—not investment advice.",
  path: "/",
});

export default async function Home() {
  const [{ manifest, source }, homeTrendingRes, compareRes, spyPerf, commentaryRes] =
    await Promise.all([
      getManifestCached(),
      getHomeTrendingCached(),
      getCompareThemesCached(),
      getSpyMarketPerfCached(),
      loadHomeCommentary(),
    ]);
  const topMoversTicker = buildTopMoversTickerItems(compareRes?.bundle?.rows ?? []);
  const homeJsonLd = buildHomePageJsonLd(homeSiteJsonDescription());
  const stats = manifest.stats;
  const trendingNames = Array.isArray(manifest.trending_themes) ? manifest.trending_themes : [];
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const etlFeed = Array.isArray(manifest.home_feed_events) ? manifest.home_feed_events : [];
  const homeFeedEvents = mergeHomeFeedEvents(manifest, themeByName, etlFeed);
  const homeFeedDisplay = prioritizeLifecycleHomeFeed(
    homeFeedEvents,
    HOME_FEED_RENDER_LIMIT,
    HOME_FEED_MAX_DAYS,
  );
  /** Full merged list (including outside the 10-day window) is on `/feed`; show link if anything is left off the home strip. */
  const hasMoreFeed = homeFeedEvents.length > homeFeedDisplay.length;
  const homeBundle = homeTrendingRes?.bundle;
  const useHomeBundle = canUseHomeTrendingBundle(manifest, trendingNames, homeBundle ?? null);

  /** Preserve manifest order; include rows even when name is missing from manifest.themes */
  const details: {
    slug: string | null;
    name: string;
    chart1y: ThemeChart1yV0 | undefined;
    chartPerf: ChartPerfReturns;
    compare_returns?: ThemeCompareReturnsV0;
    marketBaseline?: boolean;
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
  const marketRow = {
    slug: null as string | null,
    name: "S&P 500",
    chart1y: undefined as ThemeChart1yV0 | undefined,
    chartPerf: spyPerf?.chartPerf ?? {},
    compare_returns: spyPerf?.compareReturns,
    marketBaseline: true,
  };
  const detailsSorted = [...details, marketRow].sort((a, b) => {
    const va = valueForTrendingColumn("10D", a.compare_returns, a.chartPerf);
    const vb = valueForTrendingColumn("10D", b.compare_returns, b.chartPerf);
    const aOk = va != null && Number.isFinite(va);
    const bOk = vb != null && Number.isFinite(vb);
    if (aOk && bOk) return vb - va;
    if (aOk) return -1;
    if (bOk) return 1;
    return 0;
  });
  const rowsForTable = detailsSorted.map((row) => ({
    ...row,
    marketBaseline: row.marketBaseline === true,
  }));
  const trendingColumns = resolveTrendingColumnOrder(detailsSorted).filter(
    (col) => col !== "LstRpt %" && col !== "SinceLstRpt",
  );
  const selectedDateRows = Array.isArray(manifest.selected_dates) ? manifest.selected_dates : [];
  const selectedDateByKey = new Map(
    selectedDateRows.map((r) => [normalizeEventKey(String(r.day_name || "")), r]),
  );
  const fmtSlashDate = (iso?: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };
  const customDateHelpText = (col: string): string | undefined => {
    const key = normalizeEventKey(col);
    const row = selectedDateByKey.get(key);
    const datePrefix = row?.date ? `${fmtSlashDate(row.date)}: ` : "";
    if (key === "IRANWAR") return `${datePrefix}Start of U.S. War with Iran`;
    if (key === "LIBDAY")
      return `${datePrefix}U.S. President Trump's Tariff 'Liberation Day' speech date`;
    return undefined;
  };
  const eyebrow = homeEyebrowText(source);

  return (
    <PageSurface>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 className={styles.heroTitle}>
                Thematic equity intelligence, organized for discovery
              </h1>
              <p className={styles.introPunchline}>
                <span className={styles.introPunchlineLead}>Understand</span> how the world is
                moving by tracking stock market performance for hundreds of real-world themes and
                narratives.
              </p>
              <p className={styles.introMore}>
                <Link href="#newsletter-signup">Get the Den of Themes newsletter</Link>
                <span className={styles.introMoreSep} aria-hidden="true">
                  {" · "}
                </span>
                <HomeWatchlistCtaLink />
              </p>
            </div>
            {stats ? (
              <ul className={styles.statGridHero} aria-label="Site coverage stats">
                {stats.total_tickers != null ? (
                  <li className={`${styles.statCard} ${styles.statTickers}`}>
                    <strong>{stats.total_tickers.toLocaleString()}</strong>
                    <span>Public tickers tracked</span>
                  </li>
                ) : null}
                {stats.total_groups != null ? (
                  <li
                    className={`${styles.statCard} ${styles.statGroups} ${styles.statCardClickable}`}
                  >
                    <Link href="/groups" className={styles.statCardHit}>
                      <strong>{stats.total_groups}</strong>
                      <span>Theme groups</span>
                    </Link>
                  </li>
                ) : null}
                {stats.total_themes != null ? (
                  <li
                    className={`${styles.statCard} ${styles.statThemes} ${styles.statCardClickable}`}
                  >
                    <Link href="/themes" className={styles.statCardHit}>
                      <strong>{stats.total_themes}</strong>
                      <span>Curated themes</span>
                    </Link>
                  </li>
                ) : null}
                <li className={`${styles.statCard} ${styles.statMarketCap}`}>
                  <strong>
                    {stats.total_market_cap_usd != null
                      ? `$${(stats.total_market_cap_usd / 1e12).toFixed(1)}T`
                      : "—"}
                  </strong>
                  <span>Aggregate market cap (USD)</span>
                </li>
              </ul>
            ) : null}
          </div>

          <HomeTopMoversTicker
            items={topMoversTicker}
            asOfLabel={
              manifest.as_of ? formatSiteDataPublished(manifest.as_of) : undefined
            }
          />

          <div className={styles.homeFeedStack}>
            <HomeCommentaryPreview
              initialItems={commentaryRes?.commentary.items ?? []}
              previewDays={commentaryRes?.commentary.preview_days ?? 7}
            />

            <div className={styles.directoryGrid}>
              <section className={`${styles.section} ${styles.sectionTightTop}`}>
                <h2>Trending themes</h2>
              <HomeTrendingThemesTable
                rows={rowsForTable}
                columns={trendingColumns}
                columnHelp={Object.fromEntries(
                  trendingColumns.map((col) => [col, customDateHelpText(col)]),
                )}
              />
            </section>

            <DeferRender minHeight={460} rootMargin="420px 0px">
              <HomeHighlightedThemes
                items={detailsSorted
                  .filter((d) => d.slug)
                  .map((d) => ({
                    slug: d.slug as string,
                    name: d.name,
                    chart1y: d.chart1y,
                  }))}
                benchmarkPerformance={spyPerf?.benchmarkPerformance}
              />
            </DeferRender>

            <AdPlacement
              placement="homeDiscoveryMid"
              className={`${styles.adSlot} ${styles.adHomeWide}`}
              classNameWhenActive={`${styles.adSlot} ${styles.adHomeWide}`}
              placeholderLabel="Ad Slot · Discovery"
            />

            <section className={styles.section}>
              <h2>Feed</h2>
              <div className={styles.feedList}>
                {homeFeedDisplay.map((evt, idx) => {
                  const slug = String(evt.theme_slug || "").trim();
                  const displayTitle = cleanFeedTitle(evt);
                  const dateLabel = fmtFeedDate(evt.event_at);
                  const changesText = feedChangesText(evt);
                  const noteText = String(evt.note || "").trim();
                  const isThemeLifecycle =
                    evt.kind === "theme_new" ||
                    evt.kind === "theme_updated" ||
                    evt.kind === "theme_weights_updated";
                  const kindLabel =
                    evt.kind === "theme_new"
                      ? "Theme created"
                      : evt.kind === "theme_updated"
                        ? "Theme updated"
                        : evt.kind === "theme_weights_updated"
                          ? "Weights updated"
                          : evt.kind === "text_table_update"
                            ? "Thesis update"
                            : "Theme change";
                  const titleNode = slug ? (
                    <Link href={`/themes/${slug}`} className={styles.feedTitle}>
                      {displayTitle}
                    </Link>
                  ) : (
                    <span className={styles.feedTitle}>{displayTitle}</span>
                  );
                  return (
                    <article key={`${evt.kind}-${evt.event_at}-${idx}`} className={styles.feedItem}>
                      <div className={styles.feedDate}>{dateLabel}</div>
                      <div className={styles.feedBody}>
                        <div className={styles.feedTitleRow}>
                          {titleNode}
                          <span className={styles.feedKindInline}>{kindLabel}</span>
                        </div>
                        <div className={styles.feedMeta}>
                          {changesText ? <span className={styles.feedSummary}>{changesText}</span> : null}
                          {!changesText && evt.summary && !isThemeLifecycle ? (
                            <span className={styles.feedSummary}>{evt.summary}</span>
                          ) : null}
                        </div>
                        {noteText ? <div className={styles.feedNote}>{noteText}</div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              {hasMoreFeed ? (
                <p className={styles.feedMoreLink}>
                  <Link href="/feed">View full feed</Link>
                </p>
              ) : null}
            </section>
            </div>
          </div>

          <HomePublisherIntro />
        </div>
      </main>
    </PageSurface>
  );
}
