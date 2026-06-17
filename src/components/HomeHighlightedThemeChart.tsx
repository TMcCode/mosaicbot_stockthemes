"use client";

import { useEffect, useMemo, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import { fetchChartSidecar } from "@/lib/chartSidecar";
import { isSuspiciousChartPerformanceCliff, sanitizeChartPerformanceForDisplay } from "@/lib/chartPerformanceSanity";
import { priceReturnsRevalidateSeconds } from "@/lib/stockthemesCache";
import { stockthemesLiveChartPerformanceEnabled } from "@/lib/stockthemesClientConfig";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";

function chartHasRenderableData(c: ThemeChart1yV0 | undefined): boolean {
  const p = c?.performance;
  return Boolean(p?.dates?.length && p?.values?.length && p.dates.length === p.values.length);
}

type Props = {
  slug: string;
  name: string;
  chart1y?: ThemeChart1yV0;
  benchmarkPerformance?: ChartPerformanceV0;
};

export function HomeHighlightedThemeChart({ slug, name, chart1y, benchmarkPerformance }: Props) {
  const [livePerformance, setLivePerformance] = useState<ChartPerformanceV0 | undefined>(undefined);

  const chartFetchSig = useMemo(
    () =>
      [
        chartHasRenderableData(chart1y),
        chart1y?.performance?.dates?.length ?? 0,
        chart1y?.performance?.values?.length ?? 0,
      ].join(":"),
    [chart1y],
  );

  useEffect(() => {
    setLivePerformance(undefined);
  }, [slug]);

  useEffect(() => {
    if (!stockthemesLiveChartPerformanceEnabled()) return;
    if (!chartHasRenderableData(chart1y)) return;

    let cancelled = false;
    const baseline = chart1y?.performance;

    const refresh = () => {
      fetchChartSidecar("theme", slug, undefined, { live: true })
        .then((sidecar) => {
          if (cancelled || !sidecar?.performance?.dates?.length) return;
          if (isSuspiciousChartPerformanceCliff(sidecar.performance, baseline)) return;
          setLivePerformance(sidecar.performance);
        })
        .catch(() => {
          /* keep baked performance on transient CDN errors */
        });
    };

    refresh();
    const intervalMs = priceReturnsRevalidateSeconds() * 1000;
    const id = window.setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [slug, chartFetchSig, chart1y]);

  const chart1yMerged = useMemo(() => {
    if (!chart1y) return undefined;
    if (livePerformance?.dates?.length && livePerformance?.values?.length) {
      const sanitizedLive = sanitizeChartPerformanceForDisplay(livePerformance);
      if (sanitizedLive && !isSuspiciousChartPerformanceCliff(sanitizedLive, chart1y.performance)) {
        return { ...chart1y, performance: sanitizedLive } satisfies ThemeChart1yV0;
      }
    }
    return chart1y;
  }, [chart1y, livePerformance]);

  return (
    <Chart1yPanel
      chart1y={chart1yMerged}
      performanceTitle={name}
      benchmarkPerformance={benchmarkPerformance}
      compositionLegendShowMcap={false}
    />
  );
}
