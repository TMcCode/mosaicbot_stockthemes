"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import { DetailAboutIntro } from "@/components/DetailAboutIntro";
import { ThemeThesisBlock } from "@/components/ThemeThesisSection";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
import { buildCompositionMetaMap, sortConstituentsByMarketCapDesc } from "@/lib/constituentMeta";
import { TickerBadge } from "@/components/TickerBadge";
import { formatWeight } from "@/lib/formatWeight";
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
};

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

/**
 * When static export had no theme JSON at build time, try fetching the same URL in the
 * browser (needs GCS CORS for this origin). Fills charts + constituents when the object exists.
 */
export function ThemeDetailRuntimeLoader({
  slug,
  dataBaseUrl,
  benchmarkPerformance,
  selectedDates,
}: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; detail: ThemeDetailV0 }
  >({ status: "loading" });

  useEffect(() => {
    if (stockthemesLiveHydrationDisabled()) {
      setState({
        status: "error",
        message: stockthemesDevBuildHintsEnabled()
          ? THEME_RUNTIME_HYDRATE_DISABLED_DEV
          : THEME_RUNTIME_HYDRATE_DISABLED_PROD,
      });
      return;
    }

    let cancelled = false;
    const url = `${dataBaseUrl}/themes/${encodeURIComponent(slug)}.json?${stockthemesBrowserCacheBusterQuery()}`;
    fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((raw) => {
        if (cancelled) return;
        const detail = parseDetail(raw);
        posthog.capture("theme_detail_runtime_loaded", { slug });
        setState({ status: "ok", detail });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        posthog.captureException(e, { slug });
        posthog.capture("theme_detail_runtime_error", { slug, error: message });
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
    return (
      <p style={bodyStyle}>
        {stockthemesDevBuildHintsEnabled() ? THEME_RUNTIME_LOADING_DEV : THEME_RUNTIME_LOADING_COPY}
      </p>
    );
  }

  if (state.status === "error") {
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

  return (
    <>
      {stockthemesDevBuildHintsEnabled() ? (
        <p className={styles.eyebrow} style={{ marginTop: 8 }}>
          Loaded in browser · live theme JSON
        </p>
      ) : null}
      {shouldShowThemeThesisUi(detail.theme_thesis) ? (
        <ThemeThesisBlock themeThesis={detail.theme_thesis} signInNext={`/themes/${slug}`} />
      ) : null}
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
      {detail.constituents?.length ? (
        <section className={styles.section} aria-labelledby="constituents-heading-runtime">
          <h2 id="constituents-heading-runtime">Constituents</h2>
          {detail.build_id ? (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 0 }}>
              Build <code className={styles.code}>{detail.build_id}</code>
            </p>
          ) : null}
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
                {sortConstituentsByMarketCapDesc(detail.constituents).map((c) => (
                  <tr key={c.ticker}>
                    <td>
                      <div className={styles.companyCell}>
                        <span className={styles.companyName}>{c.name?.trim() || "—"}</span>
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
      ) : (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
      )}
      <DetailAboutIntro
        heading="About this theme"
        headingId="about-theme-heading-runtime"
        intro={detail.seo_intro}
      />
    </>
  );
}
