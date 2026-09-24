import Link from "next/link";
import type { Metadata } from "next";

import { FeedProgressiveList } from "@/components/FeedProgressiveList";
import { PageSurface } from "@/components/PageSurface";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import {
  FEED_PAGE_INTRO_SECONDARY,
  FEED_PAGE_PUNCHLINE,
  FEED_PAGE_TITLE,
  feedPageMetadataDescription,
} from "@/lib/feedPageCopy";
import { getManifestCached } from "@/lib/getManifestCached";
import { getHomeFeedCached } from "@/lib/getHomeFeedCached";
import { mergeHomeFeedEvents, prioritizeLifecycleFeedFull } from "@/lib/mergeHomeFeedEvents";
import { collapseFeedGroupFlippers } from "@/lib/collapseFeedGroupFlippers";
import {
  buildFeedThemeMetaBySlug,
  feedSectorOptionsFromEvents,
  slimFeedThemeMetaForSlots,
} from "@/lib/buildFeedThemeMeta";
import { buildThesisBySlugFromBundles } from "@/lib/buildThesisBySlug";
import { filterFeedEventsWithThesisText } from "@/lib/hydrateFeedThesis";
import { getHomeRadarCached } from "@/lib/getHomeRadarCached";
import { getThemesInMotionCached } from "@/lib/getThemesInMotionCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "../page.module.css";
import feedStyles from "./page.module.css";

/** First paint — rest mount via DeferRender + scroll sentinel. */
const FEED_INITIAL_VISIBLE = 8;

export const metadata: Metadata = buildPageMetadata({
  title: FEED_PAGE_TITLE,
  description: feedPageMetadataDescription(),
  path: "/feed",
});

export default async function FeedPage() {
  const [{ manifest }, homeFeedRes, radarRes, motionsRes] = await Promise.all([
    getManifestCached(),
    getHomeFeedCached().catch(() => null),
    getHomeRadarCached().catch(() => null),
    getThemesInMotionCached().catch(() => null),
  ]);
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const themeMetaAll = buildFeedThemeMetaBySlug(manifest);
  // Prefer compact home_feed.v0.json (~80–200KB) over manifest-embedded events.
  const etl =
    homeFeedRes?.bundle?.events ??
    (Array.isArray(manifest.home_feed_events) ? manifest.home_feed_events : []);
  const thesisBySlug = buildThesisBySlugFromBundles(
    radarRes?.bundle ?? null,
    motionsRes?.bundle ?? null,
  );
  // No per-theme detail hydrate here — that was the ~2s click lag. Chips/weights
  // come from ETL-baked ``membership_preview`` / ``holdings_preview`` (and
  // ``changes_preview`` parse as fallback). Thesis blurbs from radar/motions.
  const merged = mergeHomeFeedEvents(manifest, themeByName, etl);
  const withThesis = filterFeedEventsWithThesisText(merged, thesisBySlug);
  const events = collapseFeedGroupFlippers(
    prioritizeLifecycleFeedFull(withThesis),
    manifest,
  );
  const themeMetaBySlug = slimFeedThemeMetaForSlots(themeMetaAll, events);
  const sectorOptions = feedSectorOptionsFromEvents(events, themeMetaBySlug);
  const asOfIso =
    homeFeedRes?.bundle?.as_of?.trim() || manifest.as_of?.trim() || "";
  const publishedLabel = asOfIso ? formatSiteDataPublished(asOfIso) : null;

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={`${styles.intro} ${feedStyles.intro}`}>
          <p className={styles.eyebrow}>
            <Link href="/">← Home</Link>
            {" · "}
            <Link href="/commentary">Market commentary</Link>
          </p>
          <h1 className={styles.heroTitle}>{FEED_PAGE_TITLE}</h1>
          <div className={feedStyles.lede}>
            <p className={styles.introPunchline}>{FEED_PAGE_PUNCHLINE}</p>
            <p className={feedStyles.introSecondary}>{FEED_PAGE_INTRO_SECONDARY}</p>
          </div>

          {events.length === 0 ? (
            <p className={feedStyles.empty}>No feed events available.</p>
          ) : (
            <FeedProgressiveList
              events={events}
              themeMetaBySlug={themeMetaBySlug}
              thesisBySlug={thesisBySlug}
              sectorOptions={sectorOptions}
              listClassName={feedStyles.feedList}
              initialCount={FEED_INITIAL_VISIBLE}
              batchSize={FEED_INITIAL_VISIBLE}
              // Mount the whole first batch (DeferRender was sticking at eager=3 on live).
              eagerCount={FEED_INITIAL_VISIBLE}
            />
          )}
          {publishedLabel ? (
            <p className={feedStyles.feedFootnote}>
              Published{" "}
              <time dateTime={asOfIso} title="US Eastern (manifest as_of)">
                {publishedLabel}
              </time>
              . New rows after the next data publish.
            </p>
          ) : null}
        </div>
      </main>
    </PageSurface>
  );
}
