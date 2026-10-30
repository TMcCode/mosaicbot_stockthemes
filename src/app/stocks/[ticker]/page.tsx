import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { StockLensPanels } from "@/components/StockLensPanels";
import { StockPerformanceChart } from "@/components/StockPerformanceChart";
import { StockThemeTreemap } from "@/components/StockThemeTreemap";
import { StockthemesDetailUnavailable } from "@/components/StockthemesDetailUnavailable";
import { canonicalizeLogoUrl } from "@/lib/constituentLogoUrl";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSearchIndexCached } from "@/lib/getSearchIndexCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getStockDetailCached } from "@/lib/getStockDetailCached";
import { listStockFixtureTickers } from "@/lib/loadStockDetail";
import { absoluteUrl, openGraphImageAsset } from "@/lib/seoMetadata";
import { stockDetailPublicSeed } from "@/lib/stockDetailClientSeed";
import { mergeStockStaticTickers } from "@/lib/stockStaticParams";
import { stockPagePath } from "@/lib/stockPagePath";
import { detailEyebrowText } from "@/lib/stockthemesBuildHints";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { StockThemeMembershipAppV0 } from "@/types/stock.detail.v0";

import styles from "../../page.module.css";

type Props = { params: Promise<{ ticker: string }> };

/** Static export requires false; production bake still gated inside `generateStaticParams`. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const [{ index }, fixtureTickers] = await Promise.all([
    getSearchIndexCached(),
    listStockFixtureTickers(),
  ]);
  const fromIndex = (index.tickers || [])
    .map((row) => String(row.ticker || "").trim())
    .filter(Boolean);
  // Local next dev: every search_index ticker (UI checks before Contabo full stocks publish).
  if (process.env.NODE_ENV === "development") {
    const seen = new Set<string>();
    const out: { ticker: string }[] = [];
    for (const t of [...fromIndex, ...fixtureTickers]) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push({ ticker: t });
    }
    return out;
  }
  return mergeStockStaticTickers(fromIndex, fixtureTickers).map((ticker) => ({ ticker }));
}

function clipDescription(s: string, max = 158): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function stockPageDescription(
  detail: { name?: string; seo_intro?: string; themes?: { name: string }[] } | null,
  ticker: string,
): string {
  const name = detail?.name?.trim() || ticker;
  if (detail?.seo_intro?.trim()) return clipDescription(detail.seo_intro);
  const themeNames = (detail?.themes || [])
    .map((t) => t.name)
    .filter(Boolean)
    .slice(0, 4);
  const themeBit = themeNames.length ? ` Themes: ${themeNames.join("; ")}.` : "";
  return clipDescription(`${name} (${ticker}) on stockthemes.ai.${themeBit}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw || "").trim();
  const [{ index }, loaded] = await Promise.all([
    getSearchIndexCached(),
    getStockDetailCached(ticker),
  ]);
  const row = index.tickers.find((x) => x.ticker === ticker);
  const titleName = loaded?.detail.name || row?.name || ticker;
  const title = `${titleName} (${ticker})`;
  const desc = stockPageDescription(loaded?.detail ?? null, ticker);
  const ogImage = openGraphImageAsset();
  const path = stockPagePath(ticker);
  return {
    title,
    description: desc,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description: desc,
      url: absoluteUrl(path),
      siteName: "stockthemes.ai",
      type: "website",
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage.url],
    },
  };
}

export default async function StockPage({ params }: Props) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw || "").trim();
  if (!ticker) notFound();

  const dataBaseUrl = stockthemesPublicDataBase();
  /** Live/CDN builds: strip Tier B from RSC so View Source stays slim. Fixtures keep full seed. */
  const slimForCdn = Boolean(dataBaseUrl);

  const [{ index, source: indexSource }, loaded, spyPerf, { manifest }] = await Promise.all([
    getSearchIndexCached(),
    getStockDetailCached(ticker),
    slimForCdn ? Promise.resolve(null) : getSpyMarketPerfCached(),
    getManifestCached(),
  ]);

  const indexRow = index.tickers.find((r) => r.ticker === ticker);
  const inIndex = Boolean(indexRow);
  if (!inIndex && !loaded) {
    notFound();
  }

  const detail = loaded?.detail;
  const displayName = detail?.name || indexRow?.name || ticker;
  const logoUrl = canonicalizeLogoUrl(detail?.logo_url);
  const themesFromIndex =
    indexRow?.theme_slugs?.map((slug, i) => ({
      slug,
      name: indexRow.theme_names?.[i] || index.themes.find((t) => t.slug === slug)?.name || slug,
      group_slug: index.themes.find((t) => t.slug === slug)?.group_slug ?? null,
      group_name: index.themes.find((t) => t.slug === slug)?.group_name ?? null,
    })) ?? [];
  const panelThemes = detail
    ? slimForCdn
      ? stockDetailPublicSeed(detail).themes
      : (detail.themes as StockThemeMembershipAppV0[])
    : themesFromIndex;
  const heatmapCols = slimForCdn
    ? []
    : ((detail as { theme_heatmap_columns?: string[] } | undefined)?.theme_heatmap_columns ?? []);
  const selectedDates = Array.isArray(manifest.selected_dates) ? manifest.selected_dates : [];
  const chartThemes = panelThemes.map((t) => ({ slug: t.slug, name: t.name }));
  const themeCount = detail?.theme_count ?? panelThemes.length;
  const stockJsonMissing = Boolean(dataBaseUrl && inIndex && !detail);

  const pageUrl = absoluteUrl(stockPagePath(ticker));
  const desc = stockPageDescription(detail ?? null, ticker);

  return (
    <div className={`st-surface ${styles.page}`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: `${displayName} (${ticker})`,
              description: desc,
              url: pageUrl,
            },
          ],
        }}
      />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div
            className={`${styles.heroGrid} ${styles.heroGridThemeDetail} ${styles.stockHeroAreas}`}
          >
            <div className={`${styles.heroMain} ${styles.stockHeroTitleArea}`}>
              <p className={styles.eyebrow}>
                {detailEyebrowText("Stock", indexSource, loaded?.source)}
              </p>
              <h1 className={`${styles.heroTitle} ${styles.stockHeroTitle}`}>
                {logoUrl ? (
                  // Server img from Tier A logo_url — no presence-index fetch, no client JS.
                  // eslint-disable-next-line @next/next/no-img-element -- CDN logo; fixed size slot
                  <img
                    src={logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className={styles.stockHeroLogo}
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span className={styles.stockHeroTitleText}>
                  {displayName}{" "}
                  <span style={{ color: "var(--text-secondary, #888)", fontWeight: 500 }}>
                    {ticker}
                  </span>
                </span>
              </h1>
              <p style={{ color: "var(--text-secondary, #888)", marginBottom: 0 }}>
                {themeCount} theme{themeCount === 1 ? "" : "s"}
                {detail?.as_of ? ` · as of ${detail.as_of.slice(0, 10)}` : null}
              </p>
              {!detail && !dataBaseUrl ? (
                <StockthemesDetailUnavailable kind="stock" slug={ticker} />
              ) : null}
              {stockJsonMissing ? (
                <p
                  style={{
                    marginTop: 16,
                    marginBottom: 0,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 184, 77, 0.35)",
                    background: "rgba(255, 184, 77, 0.08)",
                    color: "var(--text-secondary, #9aa8a6)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  Live stock detail JSON is not on R2 yet for <code>{ticker}</code> (smoke
                  publish is AAPL / 0700.HK until Contabo full stocks). Chart + theme list come
                  from search index / ticker chart sidecar; heatmap &amp; returns appear after{" "}
                  <code>stocks/{ticker}.json</code> + Tier B sidecars publish.
                </p>
              ) : null}
            </div>
            {detail || dataBaseUrl || inIndex ? (
              <div className={styles.themeHeroRail}>
                <StockThemeTreemap
                  ticker={ticker}
                  displayName={displayName}
                  dataBaseUrl={dataBaseUrl || ""}
                  themes={panelThemes}
                  hydrateTierB={Boolean(slimForCdn && detail)}
                  asOfLabel={detail?.as_of ? detail.as_of.slice(0, 10) : null}
                />
              </div>
            ) : null}
          </div>
        </div>

        {detail || dataBaseUrl || inIndex ? (
          <>
            <StockPerformanceChart
              ticker={ticker}
              displayName={displayName}
              themes={chartThemes}
              selectedDates={selectedDates}
              initialBenchmark={slimForCdn ? undefined : spyPerf?.benchmarkPerformance}
            />
            <StockLensPanels
              ticker={ticker}
              displayName={displayName}
              logoUrl={logoUrl}
              dataBaseUrl={dataBaseUrl || ""}
              themes={panelThemes}
              heatmapColumns={heatmapCols}
              serverPriceReturns={slimForCdn ? null : loaded?.priceReturns}
              serverAsOf={detail?.as_of}
              selectedDates={selectedDates}
              hydrateTierB={Boolean(slimForCdn && detail)}
            />
          </>
        ) : null}

        <p style={{ marginTop: 32 }}>
          <Link href="/themes">← All themes</Link>
        </p>
      </main>
    </div>
  );
}
