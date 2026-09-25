import Link from "next/link";
import type { Metadata } from "next";

import { AdPlacement } from "@/components/AdPlacement";
import { DeferRender } from "@/components/DeferRender";
import { HomeCommentaryPreview } from "@/components/HomeCommentaryPreview";
import { LazySiteSearch } from "@/components/LazySiteSearch";
import { HomePublisherIntro } from "@/components/HomePublisherIntro";
import { HomeTopMoversTickerLive } from "@/components/HomeTopMoversTickerLive";
import { PageSurface } from "@/components/PageSurface";
import styles from "./page.module.css";

import {
  buildTopMoversTickerItems,
  homeTopMoversTickerPeriod,
} from "@/lib/buildTopMoversTicker";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getHomeTopMoversCached } from "@/lib/getHomeTopMoversCached";
import { buildHomePageJsonLd } from "@/lib/homePageJsonLd";
import { homeSiteJsonDescription } from "@/lib/homeSiteCopy";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { getManifestCached } from "@/lib/getManifestCached";
import { pickHomeTopMovers } from "@/lib/pickHomeTopMovers";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { brandAssetPath } from "@/lib/siteUrl";
import { HomeExploreChanging, pickExploreGroups } from "@/components/HomeExploreChanging";
import { LazyHomeNarrativeRadar } from "@/components/LazyHomeNarrativeRadar";
import { HomeNewsletterPostsLive } from "@/components/HomeNewsletterPostsLive";
import { HomeThemesInMotionTable } from "@/components/HomeThemesInMotionTable";
import { ThemesInMotionMacroChart } from "@/components/ThemesInMotionMacroChart";
import { JsonLd } from "@/components/JsonLd";
import { getHomeRadarCached } from "@/lib/getHomeRadarCached";
import { getHomeFeedCached } from "@/lib/getHomeFeedCached";
import { getRadarNewsCached } from "@/lib/getRadarNewsCached";
import { getThemesInMotionCached } from "@/lib/getThemesInMotionCached";
import { loadNewsletterPosts } from "@/lib/loadNewsletterPosts";
import { getSearchIndexCached } from "@/lib/getSearchIndexCached";
import { buildTickerCompanyNameMap } from "@/lib/loadSearchIndex";
import { mergeHomeFeedEvents, prioritizeLifecycleHomeFeed } from "@/lib/mergeHomeFeedEvents";
import { collapseFeedGroupFlippers } from "@/lib/collapseFeedGroupFlippers";
import {
  buildFeedThemeMetaBySlug,
  slimFeedThemeMetaForSlots,
} from "@/lib/buildFeedThemeMeta";
import {
  buildTickersByThemeSlug,
  feedSlotsNeedingTickerFallback,
} from "@/lib/buildTickersByThemeSlug";
import { buildThesisBySlugFromBundles } from "@/lib/buildThesisBySlug";
import {
  filterFeedEventsWithThesisText,
} from "@/lib/hydrateFeedThesis";
import {
  companyNamesFromRadarBundles,
  slimCompanyNamesForRadar,
  slimNewsForHome,
  slimRadarForHome,
} from "@/lib/slimRadarPayload";
import { buildWatchlistRadarEnrichBySlug } from "@/lib/buildWatchlistRadarEnrich";

/** Homepage Feed strip: at most this many rows, each within the last `HOME_FEED_MAX_DAYS` days. */
const HOME_FEED_RENDER_LIMIT = 7;
const HOME_FEED_MAX_DAYS = 10;

export const metadata: Metadata = buildPageMetadata({
  title: "stockthemes.ai",
  description:
    "Curated thematic equity research: hand-built theme baskets, group discovery, performance tables, and methodology-backed limitations—not investment advice.",
  path: "/",
});

export default async function Home() {
  const [
    { manifest },
    homeFeedRes,
    compareRes,
    commentaryRes,
    radarRes,
    motionsRes,
    newsRes,
    newsletterRes,
  ] = await Promise.all([
    getManifestCached(),
    getHomeFeedCached().catch(() => null),
    getCompareThemesCached(),
    loadHomeCommentary(),
    getHomeRadarCached().catch(() => null),
    getThemesInMotionCached().catch(() => null),
    getRadarNewsCached().catch(() => null),
    loadNewsletterPosts().catch(() => null),
  ]);
  const motionsHomepage = motionsRes?.bundle?.homepage ?? [];
  // Motions sector/factor chart lazy-fetches etf_benchmarks + spy_snapshot + factor
  // series from the CDN on mount — keep that out of home RSC HTML (~320KB+).
  const topMoversPeriod = homeTopMoversTickerPeriod();
  const homeJsonLd = buildHomePageJsonLd(homeSiteJsonDescription());
  const stats = manifest.stats;
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const etlFeed =
    homeFeedRes?.bundle?.events ??
    (Array.isArray(manifest.home_feed_events) ? manifest.home_feed_events : []);
  const homeRadar = slimRadarForHome(radarRes?.bundle ?? null);
  const homeNews = slimNewsForHome(newsRes?.bundle ?? null);
  // Prefer company names baked on radar/news tickers — avoid loading search_index (~1.4MB).
  const radarCompanyNames = companyNamesFromRadarBundles(homeRadar, homeNews);
  const homeFeedEvents = mergeHomeFeedEvents(manifest, themeByName, etlFeed);
  const homeThesisBySlug = buildThesisBySlugFromBundles(
    radarRes?.bundle ?? null,
    motionsRes?.bundle ?? null,
  );
  // No theme-detail hydrate on home — that was multi-second lag in next dev.
  // Thesis blurbs come from radar/motions; chips from ETL / changes_preview.
  const homeFeedWindowCandidates = prioritizeLifecycleHomeFeed(
    homeFeedEvents,
    40,
    HOME_FEED_MAX_DAYS,
  );
  const homeFeedDisplay = collapseFeedGroupFlippers(
    filterFeedEventsWithThesisText(homeFeedWindowCandidates, homeThesisBySlug),
    manifest,
  ).slice(0, HOME_FEED_RENDER_LIMIT);
  const themeMetaBySlug = slimFeedThemeMetaForSlots(
    buildFeedThemeMetaBySlug(manifest),
    homeFeedDisplay,
  );
  // Logo fallbacks only when a card still lacks ETL holdings/membership chips.
  const needTickerFallback = feedSlotsNeedingTickerFallback(homeFeedDisplay);
  const searchIndexRes =
    needTickerFallback.size > 0
      ? await getSearchIndexCached().catch(() => null)
      : null;
  const tickersByThemeSlug = searchIndexRes
    ? buildTickersByThemeSlug(searchIndexRes.index, 6, needTickerFallback)
    : undefined;
  // Fill any radar tickers still missing names from search index (rare).
  const radarCompanyNamesFilled =
    searchIndexRes && radarCompanyNames
      ? slimCompanyNamesForRadar(
          { ...buildTickerCompanyNameMap(searchIndexRes.index), ...radarCompanyNames },
          homeRadar,
          homeNews,
        )
      : radarCompanyNames;
  // Prefer compare_themes re-rank; only fetch home_top_movers if compare is empty.
  const fromCompare = buildTopMoversTickerItems(compareRes?.bundle?.rows ?? [], {
    period: topMoversPeriod,
  });
  const topMoversRes =
    fromCompare.length > 0 ? null : await getHomeTopMoversCached().catch(() => null);
  const topMoversTicker =
    fromCompare.length > 0
      ? fromCompare
      : pickHomeTopMovers(topMoversRes?.bundle, topMoversPeriod);

  const exploreGroups = pickExploreGroups(manifest, compareRes?.bundle?.rows ?? []);
  const watchlistEnrichBySlug = buildWatchlistRadarEnrichBySlug(
    compareRes?.bundle ?? null,
    homeThesisBySlug,
  );

  return (
    <PageSurface>
      <JsonLd id="home-json-ld" data={homeJsonLd} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <div className={styles.heroBrand}>
                <img
                  className={styles.heroBrandMark}
                  src={brandAssetPath("/brand/logo-icon-custom.png")}
                  alt=""
                  width={56}
                  height={56}
                  decoding="async"
                  aria-hidden
                />
                <span className={styles.heroBrandLabel}>stockthemes.ai</span>
              </div>
              <h1 className={styles.heroTitle}>
                Discover the themes shaping public markets.
              </h1>
              <p className={styles.introPunchline}>
                Follow narratives at the theme level — performance, news, and thesis updates — then
                drill into the companies behind each story.
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
                {manifest.as_of ? (
                  <li className={`${styles.statCard} ${styles.statAsOf}`}>
                    <strong>
                      <time dateTime={manifest.as_of}>
                        {formatSiteDataPublished(manifest.as_of)}
                      </time>
                    </strong>
                    <span>Data as of</span>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <div className={`${styles.heroSearch} ${styles.heroFullBleed}`}>
              <span className={styles.heroSearchLabel}>Search narratives</span>
              <LazySiteSearch
                variant="hero"
                placeholder="Type a theme, industry, idea, or ticker…"
              />
            </div>
          </div>

          <HomeCommentaryPreview
            initialItems={commentaryRes?.commentary.items ?? []}
            previewDays={commentaryRes?.commentary.preview_days ?? 7}
          />

          <LazyHomeNarrativeRadar
            radar={homeRadar}
            news={homeNews}
            companyNames={radarCompanyNamesFilled}
            watchlistEnrichBySlug={watchlistEnrichBySlug}
          />

          <HomeTopMoversTickerLive
            items={topMoversTicker}
            period={topMoversPeriod}
            asOfLabel={
              manifest.as_of ? formatSiteDataPublished(manifest.as_of) : undefined
            }
            tickerPerformanceAsOf={manifest.ticker_performance_as_of}
            serverCompare={
              compareRes?.bundle?.as_of ? { as_of: compareRes.bundle.as_of } : null
            }
            serverTopMovers={topMoversRes?.bundle ?? null}
          />

          <HomeExploreChanging
            groups={exploreGroups}
            feedSlots={homeFeedDisplay}
            tickersByThemeSlug={tickersByThemeSlug}
            themeMetaBySlug={themeMetaBySlug}
          />

          <HomeThemesInMotionTable
            rows={motionsHomepage}
            asOf={motionsRes?.bundle?.as_of ?? motionsRes?.bundle?.calc_as_of}
          />

          <div className={styles.homeFeedStack}>
            <div className={styles.directoryGrid}>
              <DeferRender minHeight={480} rootMargin="420px 0px">
                <ThemesInMotionMacroChart
                  selectedDates={
                    Array.isArray(manifest.selected_dates) ? manifest.selected_dates : []
                  }
                />
              </DeferRender>

              <HomeNewsletterPostsLive posts={newsletterRes?.bundle?.posts ?? []} />

              <AdPlacement
                placement="homeDiscoveryMid"
                className={`${styles.adSlot} ${styles.adHomeWide}`}
                classNameWhenActive={`${styles.adSlot} ${styles.adHomeWide}`}
                placeholderLabel="Ad Slot · Discovery"
              />
            </div>
          </div>

          <HomePublisherIntro />
        </div>
      </main>
    </PageSurface>
  );
}
