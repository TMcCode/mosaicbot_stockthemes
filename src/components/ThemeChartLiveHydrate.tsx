"use client";

import { useEffect, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import type { ThemeChart1yV0 } from "@/types/chart.v0";

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
 * (requires GCS CORS) so charts appear without redeploying the site.
 */
export function ThemeChartLiveHydrate({ slug, dataBaseUrl, serverChart }: Props) {
  const [chart, setChart] = useState<ThemeChart1yV0 | undefined>(() =>
    chartHasRenderableData(serverChart) ? serverChart : undefined,
  );

  useEffect(() => {
    if (chartHasRenderableData(serverChart)) {
      setChart(serverChart);
      return;
    }
    let cancelled = false;
    const url = `${dataBaseUrl}/themes/${encodeURIComponent(slug)}.json`;
    fetch(url, { credentials: "omit" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ chart_1y?: ThemeChart1yV0 }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (chartHasRenderableData(data.chart_1y)) {
          setChart(data.chart_1y);
        }
      })
      .catch(() => {
        /* keep empty / server snapshot */
      });
    return () => {
      cancelled = true;
    };
  }, [slug, dataBaseUrl, serverChart]);

  return <Chart1yPanel chart1y={chart} />;
}
