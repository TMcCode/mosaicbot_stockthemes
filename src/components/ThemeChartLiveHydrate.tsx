"use client";

import { useEffect, useMemo, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import type { CompositionMeta } from "@/lib/constituentMeta";
import type { ThemeChart1yV0 } from "@/types/chart.v0";

import styles from "@/app/page.module.css";

function chartHasRenderableData(c: ThemeChart1yV0 | undefined): boolean {
  const perf = c?.performance;
  const comp = c?.composition_indexed;
  if (perf?.dates?.length && perf?.values?.length) return true;
  if (comp?.series?.some((s) => s.dates?.length && s.values?.length)) return true;
  return false;
}

function hasComposition(c: ThemeChart1yV0 | undefined): boolean {
  return Boolean(
    c?.composition_indexed?.series?.some((s) => s.dates?.length && s.values?.length),
  );
}

type Props = {
  slug: string;
  dataBaseUrl: string;
  serverChart: ThemeChart1yV0 | undefined;
  compositionMetaByTicker?: Record<string, CompositionMeta>;
  /** Bucket path: `themes/<slug>.json` or `groups/<slug>.json`. */
  chartJsonFolder?: "themes" | "groups";
};

/**
 * Static export may embed detail JSON from build time; GCS can be newer (e.g. charts added later).
 * When the server snapshot has no drawable chart, fetch themes/… or groups/… in the browser.
 *
 * Also: when the build embeds `performance` but not yet `composition_indexed` (themes), we fetch once
 * and merge composition from the bucket so the Performance / Composition toggle can appear without
 * rebuilding the site.
 */
export function ThemeChartLiveHydrate({
  slug,
  dataBaseUrl,
  serverChart,
  compositionMetaByTicker,
  chartJsonFolder = "themes",
}: Props) {
  const [fetched, setFetched] = useState<ThemeChart1yV0 | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [noChartInPayload, setNoChartInPayload] = useState(false);
  const [lastFetchUrl, setLastFetchUrl] = useState<string | null>(null);

  const chart1y = useMemo(() => {
    if (!chartHasRenderableData(serverChart)) {
      return fetched;
    }
    if (fetched && hasComposition(fetched)) {
      return {
        ...serverChart,
        composition_indexed: fetched.composition_indexed,
      } satisfies ThemeChart1yV0;
    }
    return serverChart;
  }, [serverChart, fetched]);

  /** Avoid re-running fetch when parent passes a new object reference with identical chart data. */
  const serverChartFetchSig = useMemo(
    () =>
      [
        chartHasRenderableData(serverChart),
        hasComposition(serverChart),
        serverChart?.performance?.dates?.length ?? 0,
        serverChart?.composition_indexed?.series?.length ?? 0,
      ].join(":"),
    [serverChart],
  );

  useEffect(() => {
    const needFullChart = !chartHasRenderableData(serverChart);
    const needCompositionOnly =
      chartHasRenderableData(serverChart) && !hasComposition(serverChart);

    if (!needFullChart && !needCompositionOnly) {
      return;
    }

    let cancelled = false;
    // Bust stale browser/proxy cache so newly republished chart JSON appears immediately.
    const url = `${dataBaseUrl}/${chartJsonFolder}/${encodeURIComponent(slug)}.json?ts=${Date.now()}`;
    setLastFetchUrl(url);
    fetch(url, { credentials: "omit", cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<{ chart_1y?: ThemeChart1yV0 }>;
      })
      .then((data) => {
        if (cancelled) return;
        const live = data.chart_1y;

        if (needFullChart) {
          if (chartHasRenderableData(live)) {
            setFetched(live);
          } else {
            setNoChartInPayload(true);
          }
          return;
        }

        if (needCompositionOnly && hasComposition(live)) {
          setFetched(live);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serverChart identity can thrash; sig captures chart-relevant changes
  }, [slug, dataBaseUrl, serverChartFetchSig, chartJsonFolder]);

  return (
    <>
      <Chart1yPanel chart1y={chart1y} compositionMetaByTicker={compositionMetaByTicker} />
      {!chart1y && fetchError ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #888)",
            maxWidth: 560,
            marginTop: 8,
          }}
        >
          Could not load chart from bucket ({fetchError}).
          {lastFetchUrl ? (
            <>
              {" "}
              Request URL: <code className={styles.code}>{lastFetchUrl}</code>
            </>
          ) : null}{" "}
          Your page origin must match an entry in the bucket CORS list (e.g. use{" "}
          <code className={styles.code}>http://localhost:3000</code> not your LAN IP unless that origin is
          added). See MosaicBot <code className={styles.code}>docs/stockthemes/gcs-cors.example.json</code>{" "}
          and <code className={styles.code}>gsutil cors set …</code>.
        </p>
      ) : null}
      {!chart1y && !fetchError && noChartInPayload ? (
        <p style={{ fontSize: 14, color: "var(--text-secondary, #888)", maxWidth: 560, marginTop: 8 }}>
          Live JSON loaded but <code className={styles.code}>chart_1y</code> is missing or empty — republish
          from <code className={styles.code}>stockthemes_manifest.py</code> after intraday chart parquets
          exist.
        </p>
      ) : null}
    </>
  );
}
