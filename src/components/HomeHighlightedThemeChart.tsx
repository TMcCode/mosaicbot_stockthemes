"use client";

import { useEffect, useMemo, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import { fetchChartSidecar } from "@/lib/chartSidecar";
import { isSuspiciousChartPerformanceCliff, sanitizeChartPerformanceForDisplay } from "@/lib/chartPerformanceSanity";
import {
  referenceLastIsoFromPerformances,
  sliceBenchmarkForPeriod,
  sliceThemeChart1yForPeriod,
} from "@/lib/chartPeriodControls";
import {
  priceReturnsRevalidateSeconds,
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveChartPerformanceEnabled } from "@/lib/stockthemesClientConfig";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";

function chartHasRenderableData(c: ThemeChart1yV0 | undefined): boolean {
  const p = c?.performance;
  return Boolean(p?.dates?.length && p?.values?.length && p.dates.length === p.values.length);
}

type Props = {
  slug: string;
  name: string;
  benchmarkPerformance?: ChartPerformanceV0;
};

export function HomeHighlightedThemeChart({ slug, name, benchmarkPerformance }: Props) {
  const [fetchedChart, setFetchedChart] = useState<{
    slug: string;
    chart: ThemeChart1yV0;
  } | null>(null);
  const [fetchedLivePerformance, setFetchedLivePerformance] = useState<{
    slug: string;
    performance: ChartPerformanceV0;
  } | null>(null);
  const chart1y = fetchedChart?.slug === slug ? fetchedChart.chart : undefined;
  const livePerformance =
    fetchedLivePerformance?.slug === slug ? fetchedLivePerformance.performance : undefined;

  useEffect(() => {
    const base = stockthemesPublicDataBase();
    if (!base) return;

    const controller = new AbortController();
    const url = `${base}/themes/${encodeURIComponent(slug)}.json?${stockthemesBrowserCacheBusterQuery()}`;
    fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`theme chart ${response.status}`);
        return response.json() as Promise<{ chart_1y?: ThemeChart1yV0 }>;
      })
      .then((payload) => {
        if (chartHasRenderableData(payload.chart_1y)) {
          setFetchedChart({ slug, chart: payload.chart_1y! });
        }
      })
      .catch(() => {
        /* Chart panel keeps its loading/empty state on transient CDN errors. */
      });
    return () => controller.abort();
  }, [slug]);

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
    if (!stockthemesLiveChartPerformanceEnabled()) return;
    if (!chartHasRenderableData(chart1y)) return;

    let cancelled = false;
    const baseline = chart1y?.performance;

    const refresh = () => {
      fetchChartSidecar("theme", slug, undefined, { live: true })
        .then((sidecar) => {
          if (cancelled || !sidecar?.performance?.dates?.length) return;
          if (isSuspiciousChartPerformanceCliff(sidecar.performance, baseline)) return;
          setFetchedLivePerformance({ slug, performance: sidecar.performance });
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

  const { chart1yOneYear, benchmarkOneYear } = useMemo(() => {
    const referenceLastIso = referenceLastIsoFromPerformances([
      chart1yMerged?.performance,
      benchmarkPerformance,
    ]);
    return {
      chart1yOneYear: sliceThemeChart1yForPeriod(
        chart1yMerged,
        "1Y",
        undefined,
        referenceLastIso,
      ),
      benchmarkOneYear: sliceBenchmarkForPeriod(
        benchmarkPerformance,
        "1Y",
        undefined,
        referenceLastIso,
      ),
    };
  }, [chart1yMerged, benchmarkPerformance]);

  return (
    <Chart1yPanel
      chart1y={chart1yOneYear}
      performanceTitle={name}
      benchmarkPerformance={benchmarkOneYear}
      compositionLegendShowMcap={false}
    />
  );
}
