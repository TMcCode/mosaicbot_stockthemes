import Link from "next/link";
import type { Metadata } from "next";

import { DeferRender } from "@/components/DeferRender";
import { HomeHighlightedThemes } from "@/components/HomeHighlightedThemes";
import { HomeThemesInMotionTable } from "@/components/HomeThemesInMotionTable";
import { PageSurface } from "@/components/PageSurface";
import { getMostTalkedAboutCached } from "@/lib/getMostTalkedAboutCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getThemesInMotionCached } from "@/lib/getThemesInMotionCached";
import { slimMotionsRows } from "@/lib/slimMotionsRows";
import { buildPageMetadata } from "@/lib/seoMetadata";
import styles from "../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Most talked about",
  description:
    "Themes with the most conversation heat right now — ranked on returns, revisions, and breadth. Not a buy list.",
  path: "/most-talked-about",
});

export default async function MostTalkedAboutPage() {
  const [mostTalkedRes, motionsRes, spyPerf] = await Promise.all([
    getMostTalkedAboutCached().catch(() => null),
    getThemesInMotionCached().catch(() => null),
    getSpyMarketPerfCached().catch(() => null),
  ]);
  const pool = slimMotionsRows(
    mostTalkedRes?.bundle?.pool?.length
      ? mostTalkedRes.bundle.pool
      : mostTalkedRes?.bundle?.homepage?.length
        ? mostTalkedRes.bundle.homepage
        : motionsRes?.bundle?.pool?.length
          ? motionsRes.bundle.pool
          : motionsRes?.bundle?.homepage,
  );

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <Link href="/">← Home</Link>
            {" · "}
            <Link href="/compare?picks=1&sort=3M">Returns table (filtered)</Link>
          </p>
          <h1 className={styles.heroTitle}>Most talked about</h1>
          <p className={styles.introPunchline}>
            Your conversation-heat theme list — same set as the compare filter — with returns,
            revisions, and breadth from the Motions bake. Not a buy list. Home shows the top 10;
            this page has the full list.
          </p>
          <HomeThemesInMotionTable
            rows={pool}
            maxRows={Number.POSITIVE_INFINITY}
            showViewAll={false}
          />
          <DeferRender minHeight={460} rootMargin="200px 0px">
            <HomeHighlightedThemes
              items={pool
                .filter((d) => d.slug)
                .map((d) => ({ slug: d.slug, name: d.name }))}
              benchmarkPerformance={spyPerf?.benchmarkPerformance}
            />
          </DeferRender>
        </div>
      </main>
    </PageSurface>
  );
}
