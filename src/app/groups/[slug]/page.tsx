import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdPlacement } from "@/components/AdPlacement";
import { StockthemesDetailUnavailable } from "@/components/StockthemesDetailUnavailable";
import { Chart1yPanel } from "@/components/Chart1yPanel";
import { DeferRender } from "@/components/DeferRender";
import { ThemeChartLiveHydrate } from "@/components/ThemeChartLiveHydrate";
import styles from "../../page.module.css";

import { getGroupDetailCached } from "@/lib/getGroupDetailCached";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { loadManifest } from "@/lib/loadManifest";
import { absoluteUrl, openGraphImageAsset } from "@/lib/seoMetadata";
import { buildGroupThemeChartMetaMap } from "@/lib/constituentMeta";
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

  const loaded = await getGroupDetailCached(slug);
  const detail = loaded?.detail;
  const detailLabel =
    loaded?.source === "live" ? "live group JSON" : loaded?.source === "fixture" ? "local fixture" : null;

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

  const dataBaseUrl = stockthemesPublicDataBase() ?? null;
  const groupChartMetaBySlug = buildGroupThemeChartMetaMap(tableRows);
  const spyPerf = await getSpyMarketPerfCached();
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
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>
                Group · {source === "live" ? "live manifest" : "local fixture"}
                {detailLabel ? ` · ${detailLabel}` : ""}
              </p>
              <h1>{group.name}</h1>
              <p>
                {group.theme_count != null ? `${group.theme_count} themes` : ""}
                {group.theme_count != null && group.ticker_count != null ? " · " : ""}
                {group.ticker_count != null ? `${group.ticker_count} tickers` : ""}
              </p>
              {detail?.seo_intro ? (
                <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 640 }}>
                  {detail.seo_intro}
                </p>
              ) : null}
              {!detail ? <StockthemesDetailUnavailable kind="group" slug={slug} /> : null}
            </div>
            <AdPlacement
              placement="groupRail"
              className={`${styles.adSlot} ${styles.groupsAdCompact}`}
              classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact}`}
              placeholderLabel="Ad Slot · Group detail"
              format="horizontal"
            />
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
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Theme</th>
                    <th scope="col">Tickers</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((t) => (
                    <tr key={t.slug}>
                      <td>
                        <Link href={`/themes/${t.slug}`} className={styles.name} prefetch={false}>
                          {t.name}
                        </Link>
                      </td>
                      <td>{t.ticker_count != null ? t.ticker_count : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
