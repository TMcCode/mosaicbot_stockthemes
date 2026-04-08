import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdPlacement } from "@/components/AdPlacement";
import { Chart1yPanel } from "@/components/Chart1yPanel";
import { DeferRender } from "@/components/DeferRender";
import { TickerBadge } from "@/components/TickerBadge";
import { ThemeChartLiveHydrate } from "@/components/ThemeChartLiveHydrate";
import { ThemeDetailRuntimeLoader } from "@/components/ThemeDetailRuntimeLoader";
import {
  ThemeThesisSection,
  ThemeThesisUpdateBadge,
  themeThesisHasContent,
} from "@/components/ThemeThesisSection";
import styles from "../../page.module.css";

import { formatWeight } from "@/lib/formatWeight";
import {
  buildCompositionMetaMap,
  formatUsdMarketCap,
  inferMarketCapUsd,
  sortConstituentsByMarketCapDesc,
} from "@/lib/constituentMeta";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import { loadManifest } from "@/lib/loadManifest";
import { absoluteUrl, openGraphImageAsset } from "@/lib/seoMetadata";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render one HTML per theme for static hosting (GitHub Pages). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { manifest } = await loadManifest();
  return manifest.themes.map((t) => ({ slug: t.slug }));
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
  const { manifest, source } = await getManifestCached();
  const theme = manifest.themes.find((x) => x.slug === slug);
  if (!theme) {
    notFound();
  }

  const group = theme.group_slug
    ? manifest.groups.find((g) => g.slug === theme.group_slug)
    : undefined;

  const loaded = await getThemeDetailCached(slug);
  const detail = loaded?.detail;
  const detailLabel =
    loaded?.source === "live" ? "live theme JSON" : loaded?.source === "fixture" ? "local fixture" : null;

  const dataBaseUrl = stockthemesPublicDataBase() ?? null;
  const compositionMetaByTicker = buildCompositionMetaMap(detail?.constituents);
  const spyPerf = await getSpyMarketPerfCached();
  const totalMarketCapUsd =
    detail?.constituents?.reduce((sum, c) => sum + (inferMarketCapUsd(c) ?? 0), 0) ?? 0;
  const hasTotalMarketCap = totalMarketCapUsd > 0;

  const hasWeight = Boolean(detail?.constituents?.some((c) => c.weight != null));
  const hasMcap = Boolean(detail?.constituents?.some((c) => inferMarketCapUsd(c) != null));
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
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>
                Theme · {source === "live" ? "live manifest" : "local fixture"}
                {detailLabel ? ` · ${detailLabel}` : ""}
              </p>
              <h1>{theme.name}</h1>
              {theme.ticker_count != null || hasTotalMarketCap ? (
                <p>
                  {theme.ticker_count != null ? `${theme.ticker_count} tickers` : null}
                  {theme.ticker_count != null && hasTotalMarketCap ? " · " : null}
                  {hasTotalMarketCap ? `${formatUsdMarketCap(totalMarketCapUsd)} total market cap` : null}
                </p>
              ) : null}
              {theme.group_slug ? (
                <p>
                  Group:{" "}
                  <Link href={`/groups/${theme.group_slug}`} style={{ fontWeight: 600 }}>
                    {group?.name ?? "Group"}
                  </Link>
                </p>
              ) : null}
              {detail?.theme_thesis && themeThesisHasContent(detail.theme_thesis) ? (
                <ThemeThesisSection themeThesis={detail.theme_thesis} />
              ) : null}
              {detail?.seo_intro ? (
                <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 640 }}>
                  {detail.seo_intro}
                </p>
              ) : null}
              <ThemeThesisUpdateBadge themeThesis={detail?.theme_thesis} />
              {!detail && !dataBaseUrl ? (
                <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
                  No theme detail JSON at build time and no{" "}
                  <code className={styles.code}>NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL</code> — set it in CI so
                  the app can load <code className={styles.code}>themes/{slug}.json</code> from the bucket, or
                  add <code className={styles.code}>public/fixtures/themes/{slug}.json</code> for offline
                  builds.
                </p>
              ) : null}
            </div>
            <AdPlacement
              placement="themeRail"
              className={`${styles.adSlot} ${styles.groupsAdCompact}`}
              classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact}`}
              placeholderLabel="Ad Slot · Theme detail"
              format="horizontal"
            />
          </div>
          {!detail && dataBaseUrl ? (
            <ThemeDetailRuntimeLoader
              slug={slug}
              dataBaseUrl={dataBaseUrl}
              benchmarkPerformance={spyPerf?.benchmarkPerformance}
            />
          ) : null}
          {detail && dataBaseUrl ? (
            <DeferRender minHeight={460} rootMargin="360px 0px">
              <div className={styles.tightChartTop}>
                <ThemeChartLiveHydrate
                  key={slug}
                  slug={slug}
                  dataBaseUrl={dataBaseUrl}
                  serverChart={detail.chart_1y}
                  compositionMetaByTicker={compositionMetaByTicker}
                  performanceTitle={theme.name}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                />
              </div>
            </DeferRender>
          ) : null}
          {detail && !dataBaseUrl ? (
            <DeferRender minHeight={460} rootMargin="360px 0px">
              <div className={styles.tightChartTop}>
                <Chart1yPanel
                  chart1y={detail.chart_1y}
                  compositionMetaByTicker={compositionMetaByTicker}
                  performanceTitle={theme.name}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
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
          {detail?.constituents?.length ? (
            <section className={styles.section} aria-labelledby="constituents-heading">
              <h2 id="constituents-heading">Constituents</h2>
              {detail.build_id ? (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 0 }}>
                  Build <code className={styles.code}>{detail.build_id}</code>
                </p>
              ) : null}
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th scope="col">Company</th>
                      {hasMcap ? <th scope="col">Market cap</th> : null}
                      {hasWeight ? <th scope="col">Weight</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {sortConstituentsByMarketCapDesc(detail.constituents).map((c) => (
                      <tr key={c.ticker}>
                        <td>
                          <div className={styles.companyCell}>
                            <span className={styles.companyName}>{c.name?.trim() || "—"}</span>
                            <TickerBadge ticker={c.ticker} />
                          </div>
                        </td>
                        {hasMcap ? (
                          <td>{formatUsdMarketCap(inferMarketCapUsd(c))}</td>
                        ) : null}
                        {hasWeight ? (
                          <td>{c.weight != null ? formatWeight(c.weight) : "—"}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {detail && !detail.constituents.length ? (
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
          ) : null}
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
