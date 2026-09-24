import Link from "next/link";
import type { Metadata } from "next";

import { DeferRender } from "@/components/DeferRender";
import { HomeHighlightedThemes } from "@/components/HomeHighlightedThemes";
import { HomeThemesInMotionTable } from "@/components/HomeThemesInMotionTable";
import { PageSurface } from "@/components/PageSurface";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getThemesInMotionCached } from "@/lib/getThemesInMotionCached";
import { buildPageMetadata } from "@/lib/seoMetadata";
import styles from "../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Themes in Motion",
  description: "Calculated and editorially curated themes moving across public markets.",
  path: "/themes-in-motion",
});

export default async function ThemesInMotionPage() {
  const [motionsRes, spyPerf] = await Promise.all([
    getThemesInMotionCached().catch(() => null),
    getSpyMarketPerfCached().catch(() => null),
  ]);
  const pool = motionsRes?.bundle?.pool?.length
    ? motionsRes.bundle.pool
    : motionsRes?.bundle?.homepage ?? [];

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <Link href="/">← Home</Link>
            {" · "}
            <Link href="/compare">Full returns table</Link>
          </p>
          <h1 className={styles.heroTitle}>Themes in Motion</h1>
          <p className={styles.introPunchline}>
            Daily Motion Score plus human locks and adds. Homepage shows 10; this page lists the
            full pool.
          </p>
          <HomeThemesInMotionTable
            rows={pool}
            maxRows={Number.POSITIVE_INFINITY}
            asOf={motionsRes?.bundle?.as_of ?? motionsRes?.bundle?.calc_as_of}
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
