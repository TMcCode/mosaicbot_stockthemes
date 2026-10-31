import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeDeferredBand } from "@/components/HomeDeferredBand";
import { HomeExplorePathsSlot } from "@/components/HomeExplorePathsSlot";
import { HomeHeroStats } from "@/components/HomeHeroStats";
import { HomeMoversBand } from "@/components/HomeMoversBand";
import { JsonLd } from "@/components/JsonLd";
import { LazySiteSearch } from "@/components/LazySiteSearch";
import { PageSurface } from "@/components/PageSurface";
import { buildHomePageJsonLd } from "@/lib/homePageJsonLd";
import { homeSiteJsonDescription } from "@/lib/homeSiteCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { brandAssetPath } from "@/lib/siteUrl";

import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "stockthemes.ai",
  description:
    "Curated thematic equity research: hand-built theme baskets, group discovery, performance tables, and methodology-backed limitations—not investment advice.",
  path: "/",
});

function HomeExplorePathsFallback() {
  return <div className={styles.explorePathsFallback} aria-hidden />;
}

function HomeMoversFallback() {
  return <div className={styles.homeMoversFallback} aria-hidden />;
}

/**
 * Sync hero first; parallel Suspense islands for trending / movers / deferred body.
 * Movers no longer wait on radar+feed+motions.
 */
export default function Home() {
  const homeJsonLd = buildHomePageJsonLd(homeSiteJsonDescription());

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
                  fetchPriority="high"
                  aria-hidden
                />
                <span className={styles.heroBrandLabel}>stockthemes.ai</span>
              </div>
              <h1 className={`${styles.heroTitle} ${styles.heroTitleOneLine}`}>
                For investors who think in narratives.
              </h1>
              <p className={styles.introPunchline}>
                Track equity markets at the theme level — performance, KPIs, news, and thesis
                commentary — then drill into the companies behind each story.
              </p>
            </div>

            <Suspense fallback={null}>
              <HomeHeroStats />
            </Suspense>

            <div className={`${styles.heroSearch} ${styles.heroFullBleed}`}>
              <span className={styles.heroSearchLabel}>Search narratives</span>
              <LazySiteSearch
                variant="hero"
                placeholder="Type a theme, industry, idea, or ticker…"
              />
              <Suspense fallback={<HomeExplorePathsFallback />}>
                <HomeExplorePathsSlot />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<HomeMoversFallback />}>
            <HomeMoversBand />
          </Suspense>

          <Suspense fallback={null}>
            <HomeDeferredBand />
          </Suspense>
        </div>
      </main>
    </PageSurface>
  );
}
