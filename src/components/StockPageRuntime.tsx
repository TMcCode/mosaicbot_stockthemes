"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonLd } from "@/components/JsonLd";
import { StockLensPanels } from "@/components/StockLensPanels";
import { StockPerformanceChart } from "@/components/StockPerformanceChart";
import { StockThemeTreemap } from "@/components/StockThemeTreemap";
import { StockthemesDetailUnavailable } from "@/components/StockthemesDetailUnavailable";
import { DetailRouteLoading } from "@/components/DetailRouteLoading";
import { canonicalizeLogoUrl } from "@/lib/constituentLogoUrl";
import {
  mergeStockDetailWithApp,
  parseStockAppPayload,
  stockAppBrowserPath,
} from "@/lib/mergeStockApp";
import { absoluteUrl } from "@/lib/seoMetadata";
import { loadSearchIndexBrowser } from "@/lib/searchIndexBrowser";
import { stockPagePath } from "@/lib/stockPagePath";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import {
  stockthemesBrowserSidecarFetchBase,
  stockthemesPublicDataBase,
} from "@/lib/stockthemesPublicBase";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type {
  StockDetailV0,
  StockThemeMembershipAppV0,
  StockThemeMembershipPublicV0,
} from "@/types/stock.detail.v0";

import styles from "@/app/page.module.css";

type Props = {
  ticker: string;
};

type RuntimeState =
  | { status: "loading" }
  | { status: "not_found" }
  | {
      status: "ok";
      displayName: string;
      logoUrl: string | null;
      themeCount: number;
      asOf: string | null;
      panelThemes: StockThemeMembershipPublicV0[] | StockThemeMembershipAppV0[];
      detailMissing: boolean;
      selectedDates: ManifestSelectedDateV0[];
    };

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

function parseStockDetail(raw: string): StockDetailV0 {
  const data = JSON.parse(raw) as StockDetailV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported stock detail schema_version: ${data.schema_version}`);
  }
  if (!data.ticker || !Array.isArray(data.themes)) {
    throw new Error("Invalid stock detail JSON");
  }
  return data;
}

async function fetchJsonOk(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchTextOk(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function loadStockDetailBrowser(
  ticker: string,
  dataBaseUrl: string,
  q: string,
): Promise<ReturnType<typeof mergeStockDetailWithApp> | null> {
  if (!dataBaseUrl) return null;
  const publicUrl = `${dataBaseUrl.replace(/\/$/, "")}/stocks/${encodeURIComponent(ticker)}.json?${q}`;
  const [raw, appJson] = await Promise.all([
    fetchTextOk(publicUrl),
    fetchJsonOk(`${stockAppBrowserPath(ticker)}?${q}`),
  ]);
  if (!raw) return null;
  try {
    return mergeStockDetailWithApp(parseStockDetail(raw), parseStockAppPayload(appJson));
  } catch {
    return null;
  }
}

/**
 * Client-only stock lens for on-demand `/stocks/[ticker]` (Pages Function → `__shell`).
 * Same panels as the SSG stock page; Tier A/B come from CDN + `/cdn-app`.
 */
export function StockPageRuntime({ ticker: rawTicker }: Props) {
  const ticker = decodeURIComponent(String(rawTicker || "").trim());
  // Prefer same-origin `/stockthemes-data` rewrite in dev (CORS); CDN base in prod.
  const dataBaseUrl =
    stockthemesBrowserSidecarFetchBase() || stockthemesPublicDataBase() || "";
  const [state, setState] = useState<RuntimeState>({ status: "loading" });

  useEffect(() => {
    if (!ticker) {
      setState({ status: "not_found" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      const q = stockthemesBrowserCacheBusterQuery();
      // Shared search-index cache (nav search) + stock JSON + manifest in parallel.
      const [indexResult, detail, manifestJson] = await Promise.all([
        loadSearchIndexBrowser().catch(() => null),
        loadStockDetailBrowser(ticker, dataBaseUrl, q),
        dataBaseUrl
          ? fetchJsonOk(`${dataBaseUrl.replace(/\/$/, "")}/manifest.json?${q}`)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const index = indexResult;
      const indexRow = index?.tickers?.find((r) => r.ticker === ticker);
      const inIndex = Boolean(indexRow);
      if (!inIndex && !detail) {
        setState({ status: "not_found" });
        return;
      }

      const themesFromIndex =
        indexRow?.theme_slugs?.map((slug, i) => ({
          slug,
          name:
            indexRow.theme_names?.[i] ||
            index?.themes.find((t) => t.slug === slug)?.name ||
            slug,
          group_slug: index?.themes.find((t) => t.slug === slug)?.group_slug ?? null,
          group_name: index?.themes.find((t) => t.slug === slug)?.group_name ?? null,
        })) ?? [];

      const panelThemes = detail
        ? detail.themes.map((t) => ({
            slug: t.slug,
            name: t.name,
            group_slug: t.group_slug,
            group_name: t.group_name,
          }))
        : themesFromIndex;

      const displayName = detail?.name || indexRow?.name || ticker;
      document.title = `${displayName} (${ticker}) · stockthemes.ai`;

      let selectedDates: ManifestSelectedDateV0[] = [];
      if (
        manifestJson &&
        typeof manifestJson === "object" &&
        Array.isArray((manifestJson as { selected_dates?: unknown }).selected_dates)
      ) {
        selectedDates = (manifestJson as { selected_dates: ManifestSelectedDateV0[] })
          .selected_dates;
      }

      if (cancelled) return;
      setState({
        status: "ok",
        displayName,
        logoUrl: canonicalizeLogoUrl(detail?.logo_url),
        themeCount: detail?.theme_count ?? panelThemes.length,
        asOf: detail?.as_of ? detail.as_of.slice(0, 10) : null,
        panelThemes,
        detailMissing: Boolean(dataBaseUrl && inIndex && !detail),
        selectedDates,
      });
    })().catch(() => {
      if (!cancelled) setState({ status: "not_found" });
    });

    return () => {
      cancelled = true;
    };
  }, [ticker, dataBaseUrl]);

  if (!ticker || state.status === "not_found") {
    return (
      <div className={`st-surface ${styles.page}`}>
        <main className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Stock</p>
            <h1 className={styles.heroTitle}>{ticker || "Unknown"}</h1>
            <p style={{ color: "var(--text-secondary, #888)" }}>
              This ticker is not in the stockthemes universe.
            </p>
            <p style={{ marginTop: 32 }}>
              <Link href="/themes">← All themes</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (state.status === "loading") {
    return <DetailRouteLoading label="Loading stock…" />;
  }

  const pageUrl = absoluteUrl(stockPagePath(ticker));
  const desc = stockPageDescription(
    {
      name: state.displayName,
      themes: state.panelThemes,
    },
    ticker,
  );
  const chartThemes = state.panelThemes.map((t) => ({ slug: t.slug, name: t.name }));

  return (
    <div className={`st-surface ${styles.page}`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: `${state.displayName} (${ticker})`,
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
              <p className={styles.eyebrow}>Stock</p>
              <h1 className={`${styles.heroTitle} ${styles.stockHeroTitle}`}>
                {state.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CDN logo; fixed size slot
                  <img
                    src={state.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className={styles.stockHeroLogo}
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span className={styles.stockHeroTitleText}>
                  {state.displayName}{" "}
                  <span style={{ color: "var(--text-secondary, #888)", fontWeight: 500 }}>
                    {ticker}
                  </span>
                </span>
              </h1>
              <p style={{ color: "var(--text-secondary, #888)", marginBottom: 0 }}>
                {state.themeCount} theme{state.themeCount === 1 ? "" : "s"}
                {state.asOf ? ` · as of ${state.asOf}` : null}
              </p>
              {!dataBaseUrl ? (
                <StockthemesDetailUnavailable kind="stock" slug={ticker} />
              ) : null}
              {state.detailMissing ? (
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
                  Live stock detail JSON is not on R2 yet for <code>{ticker}</code>. Chart + theme
                  list come from search index / ticker chart sidecar; heatmap &amp; returns appear
                  after <code>stocks/{ticker}.json</code> + Tier B sidecars publish.
                </p>
              ) : null}
            </div>
            <div className={styles.themeHeroRail}>
              <StockThemeTreemap
                ticker={ticker}
                displayName={state.displayName}
                dataBaseUrl={dataBaseUrl}
                themes={state.panelThemes}
                hydrateTierB={Boolean(dataBaseUrl && !state.detailMissing)}
                asOfLabel={state.asOf}
              />
            </div>
          </div>
        </div>

        <StockPerformanceChart
          ticker={ticker}
          displayName={state.displayName}
          themes={chartThemes}
          selectedDates={state.selectedDates}
        />
        <StockLensPanels
          ticker={ticker}
          displayName={state.displayName}
          logoUrl={state.logoUrl}
          dataBaseUrl={dataBaseUrl}
          themes={state.panelThemes}
          heatmapColumns={[]}
          serverPriceReturns={null}
          serverAsOf={state.asOf ?? undefined}
          selectedDates={state.selectedDates}
          hydrateTierB={Boolean(dataBaseUrl && !state.detailMissing)}
        />

        <p style={{ marginTop: 32 }}>
          <Link href="/themes">← All themes</Link>
        </p>
      </main>
    </div>
  );
}
