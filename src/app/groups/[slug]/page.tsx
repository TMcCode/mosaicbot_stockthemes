import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdPlacement } from "@/components/AdPlacement";
import { StockthemesDetailUnavailable } from "@/components/StockthemesDetailUnavailable";
import { Chart1yPanel } from "@/components/Chart1yPanel";
import { DeferRender } from "@/components/DeferRender";
import { ThemeChartLiveHydrate } from "@/components/ThemeChartLiveHydrate";
import { GroupHeroMeta } from "@/components/GroupHeroMeta";
import { GroupHeroSummary } from "@/components/GroupHeroSummary";
import { GroupThemesTableLive } from "@/components/GroupThemesTableLive";
import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import styles from "../../page.module.css";

import { pickDefaultTreemapPeriod } from "@/lib/buildConstituentTreemapNodes";
import { buildGroupThemeTreemapNodes } from "@/lib/buildGroupThemeTreemapNodes";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { getCompareThemesCached } from "@/lib/getCompareThemesCached";
import { getGroupDetailCached } from "@/lib/getGroupDetailCached";
import { getManifestCached } from "@/lib/getManifestCached";
import {
  computeGroup10DRanks,
  rank10dFromGroupPayload,
} from "@/lib/groupCompareRank";
import {
  mergeGroupThemeTableRows,
  resolveGroupThemesMetricColumns,
} from "@/lib/groupThemesTable";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { loadManifest } from "@/lib/loadManifest";
import { absoluteUrl, openGraphImageAsset } from "@/lib/seoMetadata";
import { buildGroupThemeChartMetaMap } from "@/lib/constituentMeta";
import { detailEyebrowText } from "@/lib/stockthemesBuildHints";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { GroupDetailChildThemeV0 } from "@/types/group.detail.v0";
import type { ManifestThemeSummaryV0 } from "@/types/manifest.v0";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render one HTML per group for static hosting (GitHub Pages). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { manifest } = await loadManifest();
  return manifest.groups.map((g) => ({ slug: g.slug }));
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
  const g = manifest.groups.find((x) => x.slug === slug);
  if (!g) {
    return { title: "Group not found" };
  }
  const loaded = await getGroupDetailCached(slug);
  const desc =
    loaded?.detail.seo_intro != null && loaded.detail.seo_intro.trim() !== ""
      ? clipDescription(loaded.detail.seo_intro)
      : `${g.name}: ${g.theme_count ?? 0} themes, ${g.ticker_count ?? 0} tickers — stockthemes.ai`;
  const ogImage = openGraphImageAsset();
  return {
    title: g.name,
    description: desc,
    alternates: {
      canonical: absoluteUrl(`/groups/${slug}`),
    },
    openGraph: {
      title: g.name,
      description: desc,
      url: absoluteUrl(`/groups/${slug}`),
      siteName: "stockthemes.ai",
      type: "website",
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: g.name,
      description: desc,
      images: [ogImage.url],
    },
  };
}

function childRowFromManifest(
  themes: ManifestThemeSummaryV0[],
): { slug: string; name: string; ticker_count?: number }[] {
  return themes.map((t) => ({
    slug: t.slug,
    name: t.name,
    ticker_count: t.ticker_count ?? undefined,
  }));
}

export default async function GroupDetailPage({ params }: Props) {
  const { slug } = await params;
  const { manifest, source } = await getManifestCached();
  const group = manifest.groups.find((x) => x.slug === slug);
  if (!group) {
    notFound();
  }

  const [loaded, compareRes] = await Promise.all([
    getGroupDetailCached(slug),
    getCompareThemesCached(),
  ]);
  const detail = loaded?.detail;
  const rank10d =
    rank10dFromGroupPayload(detail?.rank_10d) ??
    rank10dFromGroupPayload(group.rank_10d) ??
    (compareRes ? computeGroup10DRanks(slug, compareRes.bundle.rows) : null);
  const themeBySlug = new Map(manifest.themes.map((t) => [t.slug, t]));
  const fromSlugs = group.theme_slugs
    ?.map((s) => themeBySlug.get(s))
    .filter((t): t is ManifestThemeSummaryV0 => t != null);
  const manifestChildren =
    fromSlugs && fromSlugs.length > 0
      ? fromSlugs
      : manifest.themes.filter((t) => t.group_slug === slug);

  const tableRows: GroupDetailChildThemeV0[] =
    detail?.themes?.length ? detail.themes : childRowFromManifest(manifestChildren);
  const groupThemeTableRows = mergeGroupThemeTableRows(
    tableRows,
    compareRes?.bundle.rows,
  );
  const groupThemeMetricColumns = resolveGroupThemesMetricColumns(groupThemeTableRows);

  const dataBaseUrl = stockthemesPublicDataBase() ?? null;
  const groupTreemapNodes = buildGroupThemeTreemapNodes(detail?.theme_treemap);
  const groupChartMetaBySlug = buildGroupThemeChartMetaMap(tableRows);
  const topTickersYtd = detail?.top_tickers_ytd ?? [];
  const spyPerf = await getSpyMarketPerfCached();
  const selectedDates = Array.isArray(manifest.selected_dates) ? manifest.selected_dates : [];
  const groupUrl = absoluteUrl(`/groups/${slug}`);
  const dateModified = detail?.as_of || manifest.as_of;
  const pageDescription = detail?.seo_intro?.trim() || `${group.name} investment theme group.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
      "@type": "CollectionPage",
      name: `${group.name} group`,
      description: pageDescription,
      url: groupUrl,
      dateModified,
      isPartOf: {
        "@type": "WebSite",
        name: "stockthemes.ai",
        url: absoluteUrl("/"),
      },
      },
      {
      "@type": "ItemList",
      name: `${group.name} themes`,
      url: groupUrl,
      numberOfItems: tableRows.length,
      itemListElement: tableRows.slice(0, 50).map((t, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/themes/${t.slug}`),
        name: t.name,
      })),
      },
    ],
  };

  return (
    <div className={`st-surface ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div
            className={`${styles.heroGrid} ${groupTreemapNodes.length ? `${styles.heroGridThemeDetail} ${styles.heroGridGroupDetail}` : ""}`}
          >
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>
                {detailEyebrowText("Group", source, loaded?.source ?? null)}
              </p>
              <h1 className={styles.heroTitle}>{group.name}</h1>
              <GroupHeroMeta
                themeCount={group.theme_count ?? detail?.theme_count}
                tickerCount={group.ticker_count ?? detail?.ticker_count}
                rank10d={rank10d}
              />
              {!detail ? <StockthemesDetailUnavailable kind="group" slug={slug} /> : null}
              {detail ? (
                <div
                  className={groupTreemapNodes.length ? styles.heroSummarySlot : undefined}
                >
                  <GroupHeroSummary
                    intro={detail.seo_intro}
                    topTickers={topTickersYtd}
                    groupSlug={slug}
                    fillRail={groupTreemapNodes.length > 0}
                  />
                </div>
              ) : null}
              <AdPlacement
                placement="groupRail"
                className={`${styles.adSlot} ${styles.groupsAdCompact} ${styles.heroMainAd}`}
                classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact} ${styles.heroMainAd}`}
                placeholderLabel="Ad Slot · Group detail"
                format="horizontal"
              />
            </div>
            <div className={styles.themeHeroRail}>
              {groupTreemapNodes.length ? (
                <ThemeHeroTreemap
                  nodes={groupTreemapNodes}
                  themeName={group.name}
                  tileMode="theme"
                  defaultReturnPeriod={pickDefaultTreemapPeriod(groupTreemapNodes)}
                  asOfLabel={
                    detail?.as_of ? formatSiteDataPublished(detail.as_of) : undefined
                  }
                />
              ) : null}
            </div>
          </div>
          {detail && dataBaseUrl ? (
            <div className={styles.tightChartTop}>
              <DeferRender minHeight={460} rootMargin="360px 0px">
                <ThemeChartLiveHydrate
                  key={slug}
                  slug={slug}
                  dataBaseUrl={dataBaseUrl}
                  serverChart={detail?.chart_1y}
                  chartJsonFolder="groups"
                  performanceTitle={group.name}
                  compositionMetaByTicker={groupChartMetaBySlug}
                  compositionLegendShowSeriesBadge={false}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                  selectedDates={selectedDates}
                />
              </DeferRender>
            </div>
          ) : null}
          {detail && !dataBaseUrl ? (
            <div className={styles.tightChartTop}>
              <DeferRender minHeight={460} rootMargin="360px 0px">
                <Chart1yPanel
                  chart1y={detail?.chart_1y}
                  performanceTitle={group.name}
                  compositionMetaByTicker={groupChartMetaBySlug}
                  compositionLegendShowSeriesBadge={false}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                  selectedDates={selectedDates}
                  sidecarEntity={{ kind: "group", slug }}
                />
              </DeferRender>
            </div>
          ) : null}
          {detail ? (
            <AdPlacement
              placement="groupStrip"
              className={`${styles.adSlot} ${styles.adChartEnd}`}
              classNameWhenActive={`${styles.adSlot} ${styles.adChartEnd}`}
              placeholderLabel="Ad Slot · Below chart"
              format="horizontal"
            />
          ) : null}
          <section className={styles.section} aria-labelledby="group-themes-heading">
            <h2 id="group-themes-heading">Themes in this group</h2>
            {detail?.build_id ? (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 0 }}>
                Build <code className={styles.code}>{detail.build_id}</code>
              </p>
            ) : null}
            <GroupThemesTableLive
              rows={groupThemeTableRows}
              metricColumns={groupThemeMetricColumns}
              selectedDates={selectedDates}
              serverCompareBundle={compareRes?.bundle ?? null}
            />
          </section>
          <p>
            <Link href="/groups" style={{ fontWeight: 500 }}>
              ← All groups
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
