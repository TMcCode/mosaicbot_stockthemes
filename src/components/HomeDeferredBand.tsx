import { AdPlacement } from "@/components/AdPlacement";
import { DeferRender } from "@/components/DeferRender";
import { HomeExploreChanging } from "@/components/HomeExploreChanging";
import { HomePublisherIntro } from "@/components/HomePublisherIntro";
import { LazyHomeNarrativeRadar } from "@/components/LazyHomeNarrativeRadar";
import { LazyHomeNewsletterPostsLive } from "@/components/LazyHomeNewsletterPostsLive";
import { LazyHomeThemesInMotionTable } from "@/components/LazyHomeThemesInMotionTable";
import { LazyThemesInMotionMacroChart } from "@/components/LazyThemesInMotionMacroChart";
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
  buildWatchlistRadarEnrichBySlug,
  collectHomeWatchlistEnrichSlugs,
} from "@/lib/buildWatchlistRadarEnrich";
import { collapseFeedGroupFlippers } from "@/lib/collapseFeedGroupFlippers";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getHomeFeedCached } from "@/lib/getHomeFeedCached";
import { getHomeRadarCached } from "@/lib/getHomeRadarCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { getRadarNewsCached } from "@/lib/getRadarNewsCached";
import { getSearchIndexCached } from "@/lib/getSearchIndexCached";
import { getThemesInMotionCached } from "@/lib/getThemesInMotionCached";
import { filterFeedEventsWithThesisText } from "@/lib/hydrateFeedThesis";
import { loadNewsletterPosts } from "@/lib/loadNewsletterPosts";
import { buildTickerCompanyNameMap } from "@/lib/loadSearchIndex";
import { mergeHomeFeedEvents, prioritizeLifecycleHomeFeed } from "@/lib/mergeHomeFeedEvents";
import { pickExploreGroups } from "@/lib/pickExploreGroups";
import { slimFeedSlotsForClient } from "@/lib/slimFeedSlots";
import { slimMotionsRows } from "@/lib/slimMotionsRows";
import {
  companyNamesFromRadarBundles,
  slimCompanyNamesForRadar,
  slimNewsForHome,
  slimRadarForHome,
} from "@/lib/slimRadarPayload";

import styles from "@/app/page.module.css";

const HOME_FEED_RENDER_LIMIT = 7;
const HOME_FEED_MAX_DAYS = 10;

/** Heavier home sections — radar / feed / motions / newsletter (parallel Suspense island). */
export async function HomeDeferredBand() {
  const [
    { manifest },
    homeFeedRes,
    compareRes,
    radarRes,
    motionsRes,
    newsRes,
    newsletterRes,
  ] = await Promise.all([
    getManifestCached(),
    getHomeFeedCached().catch(() => null),
    getCompareThemesCached(),
    getHomeRadarCached().catch(() => null),
    getThemesInMotionCached().catch(() => null),
    getRadarNewsCached().catch(() => null),
    loadNewsletterPosts().catch(() => null),
  ]);

  const motionsHomepage = slimMotionsRows(motionsRes?.bundle?.homepage, 10);
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const etlFeed =
    homeFeedRes?.bundle?.events ??
    (Array.isArray(manifest.home_feed_events) ? manifest.home_feed_events : []);
  const homeRadar = slimRadarForHome(radarRes?.bundle ?? null);
  const homeNews = slimNewsForHome(newsRes?.bundle ?? null);
  const radarCompanyNames = companyNamesFromRadarBundles(homeRadar, homeNews);
  const homeFeedEvents = mergeHomeFeedEvents(manifest, themeByName, etlFeed);
  const homeThesisBySlug = buildThesisBySlugFromBundles(
    radarRes?.bundle ?? null,
    motionsRes?.bundle ?? null,
  );
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
  const needTickerFallback = feedSlotsNeedingTickerFallback(homeFeedDisplay);
  const searchIndexRes =
    needTickerFallback.size > 0
      ? await getSearchIndexCached().catch(() => null)
      : null;
  const tickersByThemeSlug = searchIndexRes
    ? buildTickersByThemeSlug(searchIndexRes.index, 6, needTickerFallback)
    : undefined;
  const radarCompanyNamesFilled =
    searchIndexRes && radarCompanyNames
      ? slimCompanyNamesForRadar(
          { ...buildTickerCompanyNameMap(searchIndexRes.index), ...radarCompanyNames },
          homeRadar,
          homeNews,
        )
      : radarCompanyNames;
  const exploreGroups = pickExploreGroups(manifest, compareRes?.bundle?.rows ?? []);
  const feedThemeSlugs = homeFeedDisplay.flatMap((slot) => {
    const events = [slot.lead, ...(slot.siblings || [])];
    return events
      .map((e) => String(e.theme_slug || "").trim())
      .filter(Boolean);
  });
  const watchlistEnrichBySlug = buildWatchlistRadarEnrichBySlug(
    compareRes?.bundle ?? null,
    homeThesisBySlug,
    {
      slugAllowlist: collectHomeWatchlistEnrichSlugs({
        radar: homeRadar,
        feedThemeSlugs,
        thesisBySlug: homeThesisBySlug,
      }),
    },
  );

  return (
    <>
      <LazyHomeNarrativeRadar
        radar={homeRadar}
        news={homeNews}
        companyNames={radarCompanyNamesFilled}
        watchlistEnrichBySlug={watchlistEnrichBySlug}
      />

      <DeferRender minHeight={420} rootMargin="400px 0px">
        <HomeExploreChanging
          groups={exploreGroups}
          feedSlots={slimFeedSlotsForClient(homeFeedDisplay)}
          tickersByThemeSlug={tickersByThemeSlug}
          themeMetaBySlug={themeMetaBySlug}
        />
      </DeferRender>

      <LazyHomeThemesInMotionTable rows={motionsHomepage} />

      <div className={styles.homeFeedStack}>
        <div className={styles.directoryGrid}>
          <DeferRender minHeight={480} rootMargin="420px 0px">
            <LazyThemesInMotionMacroChart
              selectedDates={
                Array.isArray(manifest.selected_dates) ? manifest.selected_dates : []
              }
            />
          </DeferRender>

          <LazyHomeNewsletterPostsLive posts={newsletterRes?.bundle?.posts ?? []} />

          <AdPlacement
            placement="homeDiscoveryMid"
            className={`${styles.adSlot} ${styles.adHomeWide}`}
            classNameWhenActive={`${styles.adSlot} ${styles.adHomeWide}`}
            placeholderLabel="Ad Slot · Discovery"
          />
        </div>
      </div>

      <HomePublisherIntro />
    </>
  );
}
