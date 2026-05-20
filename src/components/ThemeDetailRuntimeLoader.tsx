"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import { ThemeThesisBlock } from "@/components/ThemeThesisSection";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
import { buildCompositionMetaMap, sortConstituentsByMarketCapDesc } from "@/lib/constituentMeta";
import { TickerBadge } from "@/components/TickerBadge";
import { formatWeight } from "@/lib/formatWeight";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveHydrationDisabled } from "@/lib/stockthemesClientConfig";
import styles from "@/app/page.module.css";

type Props = {
  slug: string;
  dataBaseUrl: string;
  benchmarkPerformance?: ChartPerformanceV0;
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
export function ThemeDetailRuntimeLoader({ slug, dataBaseUrl, benchmarkPerformance }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; detail: ThemeDetailV0 }
  >({ status: "loading" });

  useEffect(() => {
    if (stockthemesLiveHydrationDisabled()) {
      setState({
        status: "error",
        message:
          "Theme data was not embedded in this static build. In GitHub Actions run Deploy to GitHub Pages with “Re-download all theme/group JSON” enabled, or push the latest main after ETL publishes.",
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

  if (state.status === "loading") {
    return (
      <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
        Loading theme JSON from bucket…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 560 }}>
        No theme detail JSON at <code className={styles.code}>themes/{slug}.json</code> (
        {state.message}). Ensure MosaicBot <code className={styles.code}>stockthemes_manifest.py</code>{" "}
        uploaded this file to the public bucket, and that{" "}
        <strong>CORS</strong> allows GET from this site (e.g. GitHub Pages origin in{" "}
        <code className={styles.code}>gcs-cors</code>).
      </p>
    );
  }

  const detail = state.detail;
  const hasWeight = Boolean(detail.constituents?.some((c) => c.weight != null));
  const compositionMetaByTicker = buildCompositionMetaMap(detail.constituents);

  return (
    <>
      <p className={styles.eyebrow} style={{ marginTop: 8 }}>
        Loaded in browser · live theme JSON
      </p>
      {shouldShowThemeThesisUi(detail.theme_thesis) ? (
        <ThemeThesisBlock themeThesis={detail.theme_thesis} signInNext={`/themes/${slug}`} />
      ) : null}
      {detail.seo_intro ? (
        <p style={{ fontSize: 16, color: "var(--text-secondary, #666)", maxWidth: 640 }}>
          {detail.seo_intro}
        </p>
      ) : null}
      <div className={styles.tightChartTop}>
        <Chart1yPanel
          chart1y={detail.chart_1y}
          compositionMetaByTicker={compositionMetaByTicker}
          performanceTitle={detail.name}
          benchmarkPerformance={benchmarkPerformance}
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
        </section>
      ) : (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
      )}
    </>
  );
}
