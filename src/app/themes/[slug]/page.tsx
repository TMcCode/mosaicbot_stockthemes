import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdPlacement } from "@/components/AdPlacement";
import { DetailAboutIntro } from "@/components/DetailAboutIntro";
import { StockthemesDetailUnavailable } from "@/components/StockthemesDetailUnavailable";
import { Chart1yPanel } from "@/components/Chart1yPanel";
import { DeferRender } from "@/components/DeferRender";
import { WatchlistStar } from "@/components/WatchlistStar";
import { ThemeChartLiveHydrate } from "@/components/ThemeChartLiveHydrate";
import { ThemeConstituentsTable } from "@/components/ThemeConstituentsTable";
import { ThemeConstituentsTableLive } from "@/components/ThemeConstituentsTableLive";
import { ThemeHeroMeta } from "@/components/ThemeHeroMeta";
import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import { ThemeHeroTreemapLive } from "@/components/ThemeHeroTreemapLive";
import { ThemeDetailRuntimeLoader } from "@/components/ThemeDetailRuntimeLoader";
import { ThemeFactorProfile } from "@/components/ThemeFactorProfile";
import { ThemeThesisBlock } from "@/components/ThemeThesisSection";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
import {
  themeChartPerformanceSeed,
  themeDetailLiveSeed,
} from "@/lib/themeDetailClientSeed";
import styles from "../../page.module.css";

import {
  buildConstituentTreemapNodes,
  pickDefaultTreemapPeriod,
} from "@/lib/buildConstituentTreemapNodes";
import { buildCompositionMetaMap, inferMarketCapUsd } from "@/lib/constituentMeta";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { computeTheme10DRanks, rank10dFromPayload } from "@/lib/themeCompareRank";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import { getThemeFactorProfileCached } from "@/lib/loadThemeFactorProfile";
import { loadManifest } from "@/lib/loadManifest";
import {
  loadThemeSlugRedirects,
  resolveThemeSlugRedirect,
} from "@/lib/loadThemeSlugRedirects";
import { absoluteUrl, openGraphImageAsset } from "@/lib/seoMetadata";
import { detailEyebrowText } from "@/lib/stockthemesBuildHints";
import { formatTickerPerformanceAsOf } from "@/lib/formatSiteDataPublished";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import { stockthemesLivePriceReturnsEnabled } from "@/lib/stockthemesClientConfig";
import { buildThemeConstituentTableModel } from "@/lib/themeConstituentTableModel";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render one HTML per theme for static hosting (GitHub Pages). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const [{ manifest }, redirectsDoc] = await Promise.all([
    loadManifest(),
    loadThemeSlugRedirects(),
  ]);
  const slugs = new Set(manifest.themes.map((t) => t.slug));
  for (const oldSlug of Object.keys(redirectsDoc.redirects || {})) {
    const s = String(oldSlug || "").trim();
    if (s) slugs.add(s);
  }
  return [...slugs].map((slug) => ({ slug }));
}

function clipDescription(s: string, max = 158): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { manifest } = await getManifestCached();
  const t = manifest.themes.find((x) => x.slug === slug);
  if (!t) {
    return { title: "Theme not found" };
  }
  const loaded = await getThemeDetailCached(slug);
  const desc =
    loaded?.detail.seo_intro != null && loaded.detail.seo_intro.trim() !== ""
      ? clipDescription(loaded.detail.seo_intro)
      : `Stocks and exposure for ${t.name} — stockthemes.ai`;
  const ogImage = openGraphImageAsset();
  return {
    title: t.name,
    description: desc,
    alternates: {
      canonical: absoluteUrl(`/themes/${slug}`),
    },
    openGraph: {
      title: t.name,
      description: desc,
      url: absoluteUrl(`/themes/${slug}`),
      siteName: "stockthemes.ai",
      type: "article",
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t.name,
      description: desc,
      images: [ogImage.url],
    },
  };
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const redirectsDoc = await loadThemeSlugRedirects();
  const redirected = resolveThemeSlugRedirect(slug, redirectsDoc.redirects || {});
  if (redirected) {
    redirect(`/themes/${encodeURIComponent(redirected)}`);
  }
  const { manifest, source } = await getManifestCached();
  const theme = manifest.themes.find((x) => x.slug === slug);
  if (!theme) {
    notFound();
  }

  const group = theme.group_slug
    ? manifest.groups.find((g) => g.slug === theme.group_slug)
    : undefined;

  const [loaded, compareRes, factorProfile] = await Promise.all([
    getThemeDetailCached(slug),
    getCompareThemesCached(),
    getThemeFactorProfileCached(slug),
  ]);
  const detail = loaded?.detail;
  const liveDetailSeed = detail ? themeDetailLiveSeed(detail) : undefined;
  const chartPerformanceSeed = detail ? themeChartPerformanceSeed(detail) : undefined;
  const rank10d =
    rank10dFromPayload(detail?.rank_10d) ??
    rank10dFromPayload(theme.rank_10d) ??
    (compareRes
      ? computeTheme10DRanks(slug, theme.group_slug, compareRes.bundle.rows)
      : null);
  const dataBaseUrl = stockthemesPublicDataBase() ?? null;
  const compositionMetaByTicker = buildCompositionMetaMap(detail?.constituents);
  const treemapNodes = buildConstituentTreemapNodes(detail?.constituents);
  const spyPerf = await getSpyMarketPerfCached();
  const totalMarketCapUsd =
    detail?.constituents?.reduce((sum, c) => sum + (inferMarketCapUsd(c) ?? 0), 0) ?? 0;
  const hasTotalMarketCap = totalMarketCapUsd > 0;
  const constituentTableModel = detail ? buildThemeConstituentTableModel(detail) : null;
  const selectedDates = Array.isArray(manifest.selected_dates) ? manifest.selected_dates : [];
  const themeUrl = absoluteUrl(`/themes/${slug}`);
  const dateModified = detail?.updated_at || detail?.as_of || manifest.as_of;
  const pageDescription = detail?.seo_intro?.trim() || `Stocks and exposure for ${theme.name}.`;
  const mentions = (detail?.constituents || []).slice(0, 25).map((c) => ({
    "@type": "Thing",
    name: c.name ? `${c.name} (${c.ticker})` : c.ticker,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
      "@type": "WebPage",
      name: `${theme.name} theme`,
      description: pageDescription,
      url: themeUrl,
      dateModified,
      isPartOf: {
        "@type": "WebSite",
        name: "stockthemes.ai",
        url: absoluteUrl("/"),
      },
      about: [
        { "@type": "Thing", name: theme.name },
        ...(group?.name ? [{ "@type": "Thing", name: group.name }] : []),
      ],
      },
      {
      "@type": "DefinedTermSet",
      name: theme.name,
      description: pageDescription,
      url: themeUrl,
      dateModified,
      isPartOf: absoluteUrl("/themes"),
      keywords: [theme.name, group?.name, "stocks", "theme investing", "equity exposure"]
        .filter(Boolean)
        .join(", "),
      hasDefinedTerm: mentions,
      },
    ],
  };

  return (
    <div className={`st-surface ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={`${styles.heroGrid} ${treemapNodes.length ? styles.heroGridThemeDetail : ""}`}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>
                {detailEyebrowText("Theme", source, loaded?.source ?? null)}
              </p>
              <h1 className={`${styles.heroTitle} ${styles.heroTitleWithStar}`}>
                <span className={styles.heroTitleText}>{theme.name}</span>
                <WatchlistStar
                  inline
                  titleAdjacent
                  itemType="theme"
                  itemKey={slug}
                  label={theme.name}
                  signInNext={`/themes/${slug}`}
                />
              </h1>
              <ThemeHeroMeta
                tickerCount={theme.ticker_count ?? detail?.constituents?.length}
                totalMarketCapUsd={hasTotalMarketCap ? totalMarketCapUsd : undefined}
                rank10d={rank10d}
                groupSlug={theme.group_slug}
                groupName={group?.name}
              />
              {shouldShowThemeThesisUi(detail?.theme_thesis) ? (
                <ThemeThesisBlock
                  themeThesis={detail?.theme_thesis}
                  signInNext={`/themes/${slug}`}
                />
              ) : null}
              {!detail && !dataBaseUrl ? (
                <StockthemesDetailUnavailable kind="theme" slug={slug} />
              ) : null}
              <div className={treemapNodes.length ? styles.heroFactorSlot : undefined}>
                <ThemeFactorProfile
                  slug={slug}
                  dataBaseUrl={dataBaseUrl ?? ""}
                  initialProfile={factorProfile}
                  fillRail={treemapNodes.length > 0}
                  signInNext={`/themes/${slug}`}
                />
              </div>
              {!dataBaseUrl ? (
                <AdPlacement
                  placement="themeRail"
                  className={`${styles.adSlot} ${styles.groupsAdCompact} ${styles.heroMainAd}`}
                  classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact} ${styles.heroMainAd}`}
                  placeholderLabel="Ad Slot · Theme detail"
                  format="horizontal"
                />
              ) : null}
            </div>
            <div className={styles.themeHeroRail}>
              {treemapNodes.length ? (
                detail && dataBaseUrl && stockthemesLivePriceReturnsEnabled() ? (
                  <ThemeHeroTreemapLive
                    slug={slug}
                    dataBaseUrl={dataBaseUrl}
                    serverDetail={liveDetailSeed ?? detail}
                    themeName={theme.name}
                    defaultReturnPeriod={pickDefaultTreemapPeriod(treemapNodes)}
                  />
                ) : (
                  <ThemeHeroTreemap
                    nodes={treemapNodes}
                    themeName={theme.name}
                    defaultReturnPeriod={pickDefaultTreemapPeriod(treemapNodes)}
                    asOfLabel={
                      detail?.ticker_performance_as_of
                        ? formatTickerPerformanceAsOf(detail.ticker_performance_as_of)
                        : undefined
                    }
                  />
                )
              ) : null}
            </div>
          </div>
          {!detail && dataBaseUrl ? (
            <ThemeDetailRuntimeLoader
              slug={slug}
              dataBaseUrl={dataBaseUrl}
              benchmarkPerformance={spyPerf?.benchmarkPerformance}
              selectedDates={selectedDates}
            />
          ) : null}
          {detail && dataBaseUrl ? (
            <DeferRender minHeight={340} rootMargin="360px 0px">
              <div className={styles.tightChartTop}>
                <ThemeChartLiveHydrate
                  key={slug}
                  slug={slug}
                  dataBaseUrl={dataBaseUrl}
                  serverChart={chartPerformanceSeed}
                  serverDetail={liveDetailSeed}
                  compositionMetaByTicker={compositionMetaByTicker}
                  performanceTitle={theme.name}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                  selectedDates={selectedDates}
                />
              </div>
            </DeferRender>
          ) : null}
          {detail && !dataBaseUrl ? (
            <DeferRender minHeight={340} rootMargin="360px 0px">
              <div className={styles.tightChartTop}>
                <Chart1yPanel
                  chart1y={detail.chart_1y}
                  compositionMetaByTicker={compositionMetaByTicker}
                  performanceTitle={theme.name}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                  selectedDates={selectedDates}
                  sidecarEntity={{ kind: "theme", slug }}
                />
              </div>
            </DeferRender>
          ) : null}
          {detail ? (
            <AdPlacement
              placement="themeChartEnd"
              className={`${styles.adSlot} ${styles.adChartEnd}`}
              classNameWhenActive={`${styles.adSlot} ${styles.adChartEnd}`}
              placeholderLabel="Ad Slot · Below chart"
              format="horizontal"
            />
          ) : null}
          {detail?.constituents?.length && constituentTableModel ? (
            detail && dataBaseUrl && stockthemesLivePriceReturnsEnabled() ? (
              <ThemeConstituentsTableLive
                slug={slug}
                dataBaseUrl={dataBaseUrl}
                serverDetail={liveDetailSeed ?? detail}
                selectedDates={selectedDates}
              />
            ) : (
              <ThemeConstituentsTable
                detail={detail}
                model={constituentTableModel}
                selectedDates={selectedDates}
                slug={slug}
                dataBaseUrl={dataBaseUrl ?? undefined}
              />
            )
          ) : null}
          {detail && !detail.constituents.length ? (
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
          ) : null}
          <DetailAboutIntro
            heading="About this theme"
            headingId="about-theme-heading"
            intro={detail?.seo_intro}
          />
          <p>
            <Link href="/themes" style={{ fontWeight: 500 }}>
              ← All themes
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
