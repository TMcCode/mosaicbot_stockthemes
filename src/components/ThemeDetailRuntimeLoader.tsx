"use client";

import { useEffect, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import { ThemeThesisBlock } from "@/components/ThemeThesisSection";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
import { buildCompositionMetaMap, sortConstituentsByWeightDesc } from "@/lib/constituentMeta";
import { ConstituentLogo } from "@/components/ConstituentLogo";
import { TickerBadge } from "@/components/TickerBadge";
import { formatWeight } from "@/lib/formatWeight";
import { capturePostHog, capturePostHogException } from "@/lib/posthogClient";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import {
  stockthemesDevBuildHintsEnabled,
  THEME_RUNTIME_HYDRATE_DISABLED_DEV,
  THEME_RUNTIME_HYDRATE_DISABLED_PROD,
  THEME_RUNTIME_LOADING_COPY,
  THEME_RUNTIME_LOADING_DEV,
  themeRuntimeErrorDevMessage,
  themeRuntimeErrorProdMessage,
} from "@/lib/stockthemesBuildHints";
import { stockthemesLiveHydrationDisabled } from "@/lib/stockthemesClientConfig";
import styles from "@/app/page.module.css";
import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";

type Props = {
  slug: string;
  dataBaseUrl: string;
  benchmarkPerformance?: ChartPerformanceV0;
  selectedDates?: ManifestSelectedDateV0[];
  /**
   * `hero` = thesis + chart (above factor profile).
   * `constituents` = table only (below factor).
   * `all` = previous single-block behavior.
   */
  parts?: "all" | "hero" | "constituents";
};

type LoaderState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; detail: ThemeDetailV0 };

function parseDetail(raw: string): ThemeDetailV0 {
  const data = JSON.parse(raw) as ThemeDetailV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported theme detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme detail JSON");
  }
  return data;
}

const detailFetchCache = new Map<string, Promise<ThemeDetailV0>>();

function fetchThemeDetail(slug: string, dataBaseUrl: string): Promise<ThemeDetailV0> {
  const key = `${dataBaseUrl}::${slug}`;
  const existing = detailFetchCache.get(key);
  if (existing) return existing;
  const url = `${dataBaseUrl}/themes/${encodeURIComponent(slug)}.json?${stockthemesBrowserCacheBusterQuery()}`;
  const promise = fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.text();
    })
    .then((raw) => parseDetail(raw))
    .catch((err) => {
      detailFetchCache.delete(key);
      throw err;
    });
  detailFetchCache.set(key, promise);
  return promise;
}

/**
 * When static export had no theme JSON at build time, try fetching the same URL in the
 * browser (needs GCS CORS for this origin). Fills charts + constituents when the object exists.
 */
export function ThemeDetailRuntimeLoader({
  slug,
  dataBaseUrl,
  benchmarkPerformance,
  selectedDates,
  parts = "all",
}: Props) {
  const [state, setState] = useState<LoaderState>({ status: "loading" });

  useEffect(() => {
    if (stockthemesLiveHydrationDisabled()) {
      // This branch is a static configuration outcome, not a fetch subscription.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        status: "error",
        message: stockthemesDevBuildHintsEnabled()
          ? THEME_RUNTIME_HYDRATE_DISABLED_DEV
          : THEME_RUNTIME_HYDRATE_DISABLED_PROD,
      });
      return;
    }

    let cancelled = false;
    fetchThemeDetail(slug, dataBaseUrl)
      .then((detail) => {
        if (cancelled) return;
        capturePostHog("theme_detail_runtime_loaded", { slug });
        setState({ status: "ok", detail });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        capturePostHogException(e, { slug });
        capturePostHog("theme_detail_runtime_error", { slug, error: message });
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl]);

  const bodyStyle = {
    fontSize: 16,
    color: "var(--text-secondary, #666)",
    maxWidth: 560,
  } as const;

  if (state.status === "loading") {
    if (parts === "constituents") return null;
    return (
      <p style={bodyStyle}>
        {stockthemesDevBuildHintsEnabled() ? THEME_RUNTIME_LOADING_DEV : THEME_RUNTIME_LOADING_COPY}
      </p>
    );
  }

  if (state.status === "error") {
    if (parts === "constituents") return null;
    if (stockthemesDevBuildHintsEnabled()) {
      return (
        <p style={bodyStyle}>
          {themeRuntimeErrorDevMessage(slug, state.message)}
        </p>
      );
    }
    return <p style={bodyStyle}>{themeRuntimeErrorProdMessage()}</p>;
  }

  const detail = state.detail;
  const hasWeight = Boolean(detail.constituents?.some((c) => c.weight != null));
  const compositionMetaByTicker = buildCompositionMetaMap(detail.constituents);
  const showHero = parts === "all" || parts === "hero";
  const showConstituents = parts === "all" || parts === "constituents";

  return (
    <>
      {showHero && stockthemesDevBuildHintsEnabled() ? (
        <p className={styles.eyebrow} style={{ marginTop: 8 }}>
          Loaded in browser · live theme JSON
        </p>
      ) : null}
      {showHero && shouldShowThemeThesisUi(detail.theme_thesis) ? (
        <ThemeThesisBlock
          fullBleed
          themeThesis={detail.theme_thesis}
          signInNext={`/themes/${slug}`}
        />
      ) : null}
      {showHero ? (
        <div className={styles.tightChartTop}>
          <Chart1yPanel
            chart1y={detail.chart_1y}
            compositionMetaByTicker={compositionMetaByTicker}
            performanceTitle={detail.name}
            benchmarkPerformance={benchmarkPerformance}
            selectedDates={selectedDates}
            sidecarEntity={{ kind: "theme", slug }}
          />
        </div>
      ) : null}
      {showConstituents && detail.constituents?.length ? (
        <section className={styles.section} aria-labelledby="constituents-heading-runtime">
          <h2 id="constituents-heading-runtime">Constituents</h2>
          <div className={styles.tableWrap}>
            <HorizontalScrollArea className={styles.constituentsScrollWrap}>
            <div className={styles.constituentsTableSizer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  <th scope="col">Name</th>
                  {hasWeight ? <th scope="col">Weight</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortConstituentsByWeightDesc(detail.constituents).map((c) => (
                  <tr key={c.ticker}>
                    <td>
                      <div className={styles.companyCell}>
                        <ConstituentLogo
                          ticker={c.ticker}
                          logoUrl={typeof c.logo_url === "string" ? c.logo_url : null}
                        />
                        <span className={styles.companyName} title={c.name?.trim() || undefined}>
                          {c.name?.trim() || "—"}
                        </span>
                        <TickerBadge ticker={c.ticker} />
                      </div>
                    </td>
                    {hasWeight ? (
                      <td>{c.weight != null ? formatWeight(c.weight) : "—"}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </HorizontalScrollArea>
          </div>
        </section>
      ) : null}
      {showConstituents && !detail.constituents.length ? (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
      ) : null}
    </>
  );
}
