import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeDeferredBand } from "@/components/HomeDeferredBand";
import { HomeExplorePathsSlot } from "@/components/HomeExplorePathsSlot";
import { HomeHeroSignInHint } from "@/components/HomeHeroSignInHint";
import { HomeHeroStats } from "@/components/HomeHeroStats";
import { HomeMoversBand } from "@/components/HomeMoversBand";
import { JsonLd } from "@/components/JsonLd";
import { HeroSiteSearch } from "@/components/HeroSiteSearch";
import { PageSurface } from "@/components/PageSurface";
import { buildHomePageJsonLd } from "@/lib/homePageJsonLd";
import { homeSiteJsonDescription } from "@/lib/homeSiteCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "stockthemes.ai",
  description:
    "Curated thematic equity research: hand-built theme baskets, group discovery, performance tables, and methodology-backed limitations—not investment advice.",
  path: "/",
});

/**
 * Inline SVG of the brand mark (same geometry as /brand/logo-icon.svg, rebased to a 0,0 viewBox).
 * Four outer circles roll in separately (CSS only), then the orange core stamps on.
 * Static logo is the default; animation only runs when reduced motion is not requested.
 */
function HeroAnimatedLogo() {
  return (
    <svg
      className={styles.heroBrandMark}
      viewBox="0 0 623 614"
      width={56}
      height={56}
      aria-hidden
      focusable="false"
    >
      <circle className={`${styles.logoBall} ${styles.logoBallTeal}`} cx="147.5" cy="307" r="147.5" fill="#2ACFC8" />
      <circle className={`${styles.logoBall} ${styles.logoBallNavy}`} cx="295.5" cy="467" r="147" fill="#3B4DA2" />
      <circle className={`${styles.logoBall} ${styles.logoBallPurple}`} cx="476" cy="307" r="147" fill="#695BF8" />
      <circle className={`${styles.logoBall} ${styles.logoBallRed}`} cx="295.5" cy="147" r="147" fill="#E63946" />
      <circle className={styles.logoCore} cx="304" cy="315.5" r="50" fill="#FFB86A" />
    </svg>
  );
}

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
                <HeroAnimatedLogo />
                <span className={`${styles.heroBrandLabel} ${styles.heroBrandLabelReveal}`}>
                  stockthemes.ai
                </span>
              </div>
              <div className={styles.heroTitleBlock}>
                <div className={styles.heroTitleRow}>
                  <h1
                    className={`${styles.heroTitle} ${styles.heroTitleOneLine} ${styles.heroTitleRollIn}`}
                  >
                    Your Thematic Investor Toolkit
                  </h1>
                  {/* Mobile only: brand row is hidden there, so show the animated mark beside the title. */}
                  <div className={styles.heroTitleLogoMobile}>
                    <HeroAnimatedLogo />
                  </div>
                </div>
                <p className={styles.introPunchlineForest}>
                  See the Forest for the Themes
                </p>
              </div>
            </div>

            <Suspense fallback={null}>
              <HomeHeroStats />
            </Suspense>
            <HomeHeroSignInHint />

            <div className={`${styles.heroSearchStack} ${styles.heroFullBleed}`}>
              <p className={styles.introPunchlineHow}>
                Type a stock or theme keyword below.
              </p>
              <div className={styles.heroSearch}>
                <span className={styles.heroSearchLabel}>Stock or theme</span>
                <HeroSiteSearch placeholder="e.g. NVDA, robotics, data centers…" />
                <Suspense fallback={<HomeExplorePathsFallback />}>
                  <HomeExplorePathsSlot />
                </Suspense>
              </div>
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
