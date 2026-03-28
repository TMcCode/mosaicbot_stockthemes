"use client";

import { useEffect, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import type { ThemeChart1yV0 } from "@/types/chart.v0";

import styles from "@/app/page.module.css";

function chartHasRenderableData(c: ThemeChart1yV0 | undefined): boolean {
  const perf = c?.performance;
  const comp = c?.composition_indexed;
  if (perf?.dates?.length && perf?.values?.length) return true;
  if (comp?.series?.some((s) => s.dates?.length && s.values?.length)) return true;
  return false;
}

type Props = {
  slug: string;
  dataBaseUrl: string;
  serverChart: ThemeChart1yV0 | undefined;
};

/**
 * Static export may embed theme JSON from build time; GCS can be newer (e.g. charts added later).
 * When the server snapshot has no drawable chart, fetch the same themes/<slug>.json in the browser
 * (requires GCS CORS for this site's origin) so charts appear without redeploying the site.
 */
export function ThemeChartLiveHydrate({ slug, dataBaseUrl, serverChart }: Props) {
  const [chart, setChart] = useState<ThemeChart1yV0 | undefined>(() =>
    chartHasRenderableData(serverChart) ? serverChart : undefined,
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [noChartInPayload, setNoChartInPayload] = useState(false);

  useEffect(() => {
    if (chartHasRenderableData(serverChart)) {
      setChart(serverChart);
      setFetchError(null);
      setNoChartInPayload(false);
      return;
    }
    let cancelled = false;
    setFetchError(null);
    setNoChartInPayload(false);
    const url = `${dataBaseUrl}/themes/${encodeURIComponent(slug)}.json`;
    fetch(url, { credentials: "omit" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<{ chart_1y?: ThemeChart1yV0 }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (chartHasRenderableData(data.chart_1y)) {
          setChart(data.chart_1y);
        } else {
          setNoChartInPayload(true);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setFetchError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl, serverChart]);

  return (
    <>
      <Chart1yPanel chart1y={chart} />
      {!chart && fetchError ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #888)",
            maxWidth: 560,
            marginTop: 8,
          }}
        >
          Could not load chart from bucket ({fetchError}). For a custom domain like{" "}
          <strong>stockthemes.ai</strong>, add that origin to your GCS bucket{" "}
          <strong>CORS</strong> config (see MosaicBot{" "}
          <code className={styles.code}>docs/stockthemes/gcs-cors.example.json</code>
          ), then apply with <code className={styles.code}>gsutil cors set …</code>.
        </p>
      ) : null}
      {!chart && !fetchError && noChartInPayload ? (
        <p style={{ fontSize: 14, color: "var(--text-secondary, #888)", maxWidth: 560, marginTop: 8 }}>
          Live theme JSON loaded but <code className={styles.code}>chart_1y</code> is missing or empty —
          republish from <code className={styles.code}>stockthemes_manifest.py</code> after intraday chart
          parquets exist.
        </p>
      ) : null}
    </>
  );
}
