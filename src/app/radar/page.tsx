import Link from "next/link";
import type { Metadata } from "next";

import { HomeNarrativeRadar } from "@/components/HomeNarrativeRadar";
import { PageSurface } from "@/components/PageSurface";
import { getHomeRadarCached } from "@/lib/getHomeRadarCached";
import { getRadarNewsCached } from "@/lib/getRadarNewsCached";
import { getSearchIndexCached } from "@/lib/getSearchIndexCached";
import { buildTickerCompanyNameMap } from "@/lib/loadSearchIndex";
import { slimCompanyNamesForRadar } from "@/lib/slimRadarPayload";
import { buildPageMetadata } from "@/lib/seoMetadata";
import styles from "../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Narrative Radar",
  description: "Your daily look at the narratives driving the market.",
  path: "/radar",
});

// Static export: do not read `searchParams` here (forces dynamic). Tab/as_of hydrate
// from the URL in HomeNarrativeRadar on the client.
export default async function RadarPage() {
  const [radarRes, newsRes, searchIndexRes] = await Promise.all([
    getHomeRadarCached().catch(() => null),
    getRadarNewsCached().catch(() => null),
    getSearchIndexCached().catch(() => null),
  ]);
  const bundle = radarRes?.bundle ?? null;
  const newsBundle = newsRes?.bundle ?? null;
  const companyNamesFull = searchIndexRes
    ? buildTickerCompanyNameMap(searchIndexRes.index)
    : undefined;

  // Expand home lists to `all` for this page when present
  const expanded = bundle
    ? {
        ...bundle,
        tabs: {
          new: {
            home: bundle.tabs.new.all?.length ? bundle.tabs.new.all : bundle.tabs.new.home,
            all: bundle.tabs.new.all?.length ? bundle.tabs.new.all : bundle.tabs.new.home,
          },
          accelerating: {
            home: bundle.tabs.accelerating.all?.length
              ? bundle.tabs.accelerating.all
              : bundle.tabs.accelerating.home,
            all: bundle.tabs.accelerating.all?.length
              ? bundle.tabs.accelerating.all
              : bundle.tabs.accelerating.home,
          },
          fading: {
            home: bundle.tabs.fading.all?.length ? bundle.tabs.fading.all : bundle.tabs.fading.home,
            all: bundle.tabs.fading.all?.length ? bundle.tabs.fading.all : bundle.tabs.fading.home,
          },
        },
      }
    : null;

  const expandedNews =
    newsBundle && newsBundle.today
      ? {
          ...newsBundle,
          today: {
            ...newsBundle.today,
            home: newsBundle.today.all?.length ? newsBundle.today.all : newsBundle.today.home,
            all: newsBundle.today.all?.length ? newsBundle.today.all : newsBundle.today.home,
          },
        }
      : newsBundle;

  const companyNames = slimCompanyNamesForRadar(
    companyNamesFull,
    expanded,
    expandedNews,
  );

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={`${styles.intro} ${styles.introRadar}`}>
          <p className={styles.eyebrow}>
            <Link href="/">← Home</Link>
          </p>
          <h1 className={styles.heroTitle}>Narrative Radar</h1>
          <p className={styles.introPunchline}>
            Your daily look at the narratives driving the market.
          </p>
          <HomeNarrativeRadar
            radar={expanded}
            news={expandedNews}
            companyNames={companyNames}
            previewLimit={0}
          />
        </div>
      </main>
    </PageSurface>
  );
}
