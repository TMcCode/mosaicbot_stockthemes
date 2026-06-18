import Link from "next/link";
import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import { DeferRender } from "@/components/DeferRender";
import { HomeCommentaryPreview } from "@/components/HomeCommentaryPreview";
import { HomeHeroGuide } from "@/components/HomeHeroGuide";
import { HomeHighlightedThemes } from "@/components/HomeHighlightedThemes";
import { HomePublisherIntro } from "@/components/HomePublisherIntro";
import { HomeTopMoversTickerLive } from "@/components/HomeTopMoversTickerLive";
import { HomeWatchlistCtaLink } from "@/components/HomeWatchlistCtaLink";
import { HomeTrendingThemesTableLive } from "@/components/HomeTrendingThemesTableLive";
import { PageSurface } from "@/components/PageSurface";
import styles from "./page.module.css";

import {
  buildTopMoversTickerItems,
  homeTopMoversTickerPeriod,
} from "@/lib/buildTopMoversTicker";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getHomeTopMoversCached } from "@/lib/getHomeTopMoversCached";
import { getHomeTrendingCached } from "@/lib/getHomeTrendingCached";
import { buildHomePageJsonLd } from "@/lib/homePageJsonLd";
import { homeSiteJsonDescription } from "@/lib/homeSiteCopy";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { pickHomeTopMovers } from "@/lib/pickHomeTopMovers";
import { resolveHomeTrendingRows } from "@/lib/resolveHomeTrendingRows";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { buildSelectedDateLookup, customDateHelpText } from "@/lib/customDateColumnHelp";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { homeEyebrowText } from "@/lib/stockthemesBuildHints";
import { sortHomeTrendingRows } from "@/lib/sortHomeTrendingRows";
import { resolveTrendingColumnOrder } from "@/lib/trendingCompareMetrics";
import { FeedThesisThemesSummary } from "@/components/FeedThesisThemesSummary";
import { getSearchIndexCached } from "@/lib/getSearchIndexCached";
import { buildTickerToThemeNamesMap } from "@/lib/loadSearchIndex";
import { mergeHomeFeedEvents, prioritizeLifecycleHomeFeed } from "@/lib/mergeHomeFeedEvents";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

function fmtFeedDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
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
  const [{ manifest, source }, searchIndexRes, homeTrendingRes, compareRes, topMoversRes, spyPerf, commentaryRes] =
    await Promise.all([
      getManifestCached(),
      getSearchIndexCached().catch(() => null),
      getHomeTrendingCached(),
      getCompareThemesCached(),
      getHomeTopMoversCached(),
      getSpyMarketPerfCached(),
      loadHomeCommentary(),
    ]);
  const topMoversPeriod = homeTopMoversTickerPeriod();
  const homeJsonLd = buildHomePageJsonLd(homeSiteJsonDescription());
  const stats = manifest.stats;
  const trendingNames = Array.isArray(manifest.trending_themes) ? manifest.trending_themes : [];
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const etlFeed = Array.isArray(manifest.home_feed_events) ? manifest.home_feed_events : [];
  const tickerToThemeNames = searchIndexRes
    ? buildTickerToThemeNamesMap(searchIndexRes.index)
    : undefined;
  const homeFeedEvents = mergeHomeFeedEvents(manifest, themeByName, etlFeed, { tickerToThemeNames });
  const homeFeedDisplay = prioritizeLifecycleHomeFeed(
    homeFeedEvents,
    HOME_FEED_RENDER_LIMIT,
    HOME_FEED_MAX_DAYS,
  );
  /** Full merged list (including outside the 10-day window) is on `/feed`; show link if anything is left off the home strip. */
  const precomputedTopMovers = pickHomeTopMovers(topMoversRes?.bundle, topMoversPeriod);
  const topMoversTicker =
    precomputedTopMovers.length > 0
      ? precomputedTopMovers
      : buildTopMoversTickerItems(compareRes?.bundle?.rows ?? [], {
          period: topMoversPeriod,
        });

  const details = resolveHomeTrendingRows(
    trendingNames,
    manifest,
    homeTrendingRes?.bundle,
    compareRes?.bundle?.rows,
  );
  const marketRow = {
    slug: null as string | null,
    name: "S&P 500",
    chart1y: undefined as ThemeChart1yV0 | undefined,
    chartPerf: spyPerf?.chartPerf ?? {},
    compare_returns: spyPerf?.compareReturns,
    marketBaseline: true,
  };
  // Weekdays: 1D (matches ticker); Sat/Sun ET: 10D when markets are closed.
  const detailsSorted = sortHomeTrendingRows([...details, marketRow], topMoversPeriod);
  const rowsForTable = detailsSorted.map((row) => ({
    ...row,
    marketBaseline: row.marketBaseline === true,
  }));
  const trendingColumns = resolveTrendingColumnOrder(detailsSorted).filter(
    (col) => col !== "LstRpt %" && col !== "SinceLstRpt",
  );
  const selectedDateByKey = buildSelectedDateLookup(
    Array.isArray(manifest.selected_dates) ? manifest.selected_dates : [],
  );
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
                Thematic equity intelligence
              </h1>
              <p className={styles.introPunchline}>
                <span className={styles.introPunchlineLead}>Discover what&apos;s moving.</span> See
                the tickers behind it.
              </p>
              <HomeHeroGuide />
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

          <HomeTopMoversTickerLive
            items={topMoversTicker}
            period={topMoversPeriod}
            asOfLabel={
              manifest.as_of ? formatSiteDataPublished(manifest.as_of) : undefined
            }
            tickerPerformanceAsOf={manifest.ticker_performance_as_of}
            serverTopMoversBundle={topMoversRes?.bundle ?? null}
          />

          <div className={styles.homeFeedStack}>
            <HomeCommentaryPreview
              initialItems={commentaryRes?.commentary.items ?? []}
              previewDays={commentaryRes?.commentary.preview_days ?? 7}
            />

            <div className={styles.directoryGrid}>
              <section
                id="trending-themes"
                className={`${styles.section} ${styles.sectionTightTop}`}
              >
                <h2>Trending themes</h2>
              <HomeTrendingThemesTableLive
                rows={rowsForTable}
                columns={trendingColumns}
                sortPeriod={topMoversPeriod}
                columnHelp={Object.fromEntries(
                  trendingColumns.map((col) => [col, customDateHelpText(col, selectedDateByKey)]),
                )}
                serverCompareBundle={compareRes?.bundle ?? null}
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
              <div className={styles.sectionHeader}>
                <h2>Feed</h2>
                <p className={styles.feedMoreLink}>
                  <Link href="/feed">See all</Link>
                </p>
              </div>
              <div className={styles.feedList}>
                {homeFeedDisplay.map((evt, idx) => {
                  const slug = String(evt.theme_slug || "").trim();
                  const linkThemeSlug =
                    evt.kind === "text_table_update" ? "" : slug;
                  const displayTitle = cleanFeedTitle(evt);
                  const showThesisThemes =
                    evt.kind === "text_table_update" &&
                    (Boolean(evt.thesis_themes?.length) ||
                      String(evt.summary || "").trim().startsWith("Themes:"));
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
                  const titleNode = linkThemeSlug ? (
                    <Link href={`/themes/${linkThemeSlug}`} className={styles.feedTitle}>
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
                          {!changesText && showThesisThemes ? <FeedThesisThemesSummary evt={evt} /> : null}
                          {!changesText && !showThesisThemes && evt.summary && !isThemeLifecycle ? (
                            <span className={styles.feedSummary}>{evt.summary}</span>
                          ) : null}
                        </div>
                        {noteText ? <div className={styles.feedNote}>{noteText}</div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            </div>
          </div>

          <HomePublisherIntro />
        </div>
      </main>
    </PageSurface>
  );
}
