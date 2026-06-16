"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import type { CompositionMeta } from "@/lib/constituentMeta";
import { fetchChartSidecar } from "@/lib/chartSidecar";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";

import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
  priceReturnsRevalidateSeconds,
} from "@/lib/stockthemesCache";
import {
  CHART_FETCH_ERROR_PROD,
  CHART_MISSING_IN_PAYLOAD_DEV,
  CHART_MISSING_IN_PAYLOAD_PROD,
  chartFetchErrorDevMessage,
  stockthemesDevBuildHintsEnabled,
} from "@/lib/stockthemesBuildHints";
import { useLiveThemeDetailPrices } from "@/hooks/useLiveThemeDetailPrices";
import {
  stockthemesLiveChartPerformanceEnabled,
  stockthemesLiveCompositionEnabled,
  stockthemesLiveHydrationDisabled,
} from "@/lib/stockthemesClientConfig";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

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

/** Cheap structural key so merged `chart_1y` keeps a stable reference when data is unchanged. */
function chartStructuralKey(c: ThemeChart1yV0 | undefined): string {
  if (!c) return "";
  const p = c.performance;
  const comp = c.composition_indexed;
  const pl = p?.dates?.length ?? 0;
  const pTail = pl ? `${p!.dates![pl - 1]}\0${p!.values?.[pl - 1] ?? ""}` : "";
  const rows =
    comp?.series
      ?.filter((s) => s.dates?.length && s.values?.length)
      .map((s) => {
        const L = s.dates!.length;
        return `${s.ticker}:${L}:${s.values![L - 1]}`;
      })
      .join("\x1e") ?? "";
  return `${pl}\x1f${pTail}\x1f${rows}`;
}

type Props = {
  slug: string;
  dataBaseUrl: string;
  serverChart: ThemeChart1yV0 | undefined;
  compositionMetaByTicker?: Record<string, CompositionMeta>;
  /** Performance tooltip label (theme or group display name). */
  performanceTitle?: string;
  /** Bucket path: `themes/<slug>.json` or `groups/<slug>.json`. */
  chartJsonFolder?: "themes" | "groups";
  compositionLegendShowSeriesBadge?: boolean;
  /** Optional benchmark overlay for performance view (e.g., S&P 500). */
  benchmarkPerformance?: ChartPerformanceV0;
  /** Optional full theme detail for live composition refresh (themes only). */
  serverDetail?: ThemeDetailV0;
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
  performanceTitle,
  chartJsonFolder = "themes",
  compositionLegendShowSeriesBadge = true,
  benchmarkPerformance,
  serverDetail,
}: Props) {
  const compositionLive = stockthemesLiveCompositionEnabled() && chartJsonFolder === "themes" && Boolean(serverDetail);
  const { detail: liveDetail } = useLiveThemeDetailPrices(
    slug,
    dataBaseUrl,
    serverDetail ?? ({
      schema_version: 0,
      slug,
      name: performanceTitle ?? slug,
      as_of: "",
      constituents: [],
    } satisfies ThemeDetailV0),
  );
  const serverChartWithComposition = useMemo(() => {
    if (!compositionLive || !liveDetail?.chart_1y?.composition_indexed) {
      return serverChart;
    }
    if (!serverChart) {
      return liveDetail.chart_1y;
    }
    return {
      ...serverChart,
      composition_indexed: liveDetail.chart_1y.composition_indexed,
    } satisfies ThemeChart1yV0;
  }, [compositionLive, liveDetail?.chart_1y, serverChart]);

  const [fetched, setFetched] = useState<ThemeChart1yV0 | undefined>(undefined);
  const [livePerformance, setLivePerformance] = useState<ChartPerformanceV0 | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [noChartInPayload, setNoChartInPayload] = useState(false);
  const [lastFetchUrl, setLastFetchUrl] = useState<string | null>(null);

  const serverChartRef = useRef(serverChartWithComposition);
  const fetchedRef = useRef(fetched);
  serverChartRef.current = serverChartWithComposition;
  fetchedRef.current = fetched;

  const serverKey = chartStructuralKey(serverChartWithComposition);
  const fetchedKey = chartStructuralKey(fetched);
  const livePerfKey = useMemo(() => {
    const p = livePerformance;
    const pl = p?.dates?.length ?? 0;
    if (!pl) return "";
    return `${pl}\x1f${p!.dates![pl - 1]}\x1f${p!.values?.[pl - 1] ?? ""}`;
  }, [livePerformance]);

  const chart1y = useMemo(() => {
    const sc = serverChartRef.current;
    const fd = fetchedRef.current;
    let base: ThemeChart1yV0 | undefined;
    if (!chartHasRenderableData(sc)) {
      base = fd;
    } else if (fd && hasComposition(fd)) {
      base = {
        ...sc,
        composition_indexed: fd.composition_indexed,
      } satisfies ThemeChart1yV0;
    } else {
      base = sc;
    }
    if (base && livePerformance?.dates?.length && livePerformance?.values?.length) {
      return { ...base, performance: livePerformance } satisfies ThemeChart1yV0;
    }
    return base;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- structural keys (not object identity) keep stable `chart1y`; refs hold latest payloads
  }, [serverKey, fetchedKey, livePerfKey]);

  /** Avoid re-running fetch when parent passes a new object reference with identical chart data. */
  const serverChartFetchSig = useMemo(
    () =>
      [
        chartHasRenderableData(serverChartWithComposition),
        hasComposition(serverChartWithComposition),
        serverChartWithComposition?.performance?.dates?.length ?? 0,
        serverChartWithComposition?.composition_indexed?.series?.length ?? 0,
      ].join(":"),
    [serverChartWithComposition],
  );

  useEffect(() => {
    const needFullChart = !chartHasRenderableData(serverChartWithComposition);
    const needCompositionOnly =
      chartHasRenderableData(serverChartWithComposition) && !hasComposition(serverChartWithComposition);
    const refreshLiveInDev =
      process.env.NODE_ENV === "development" && !stockthemesLiveHydrationDisabled();

    if (stockthemesLiveHydrationDisabled()) {
      return;
    }

    if (!needFullChart && !needCompositionOnly && !refreshLiveInDev) {
      return;
    }

    let cancelled = false;
    const url = `${dataBaseUrl}/${chartJsonFolder}/${encodeURIComponent(slug)}.json?${stockthemesBrowserCacheBusterQuery()}`;
    setLastFetchUrl(url);
    fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<{ chart_1y?: ThemeChart1yV0 }>;
      })
      .then((data) => {
        if (cancelled) return;
        const live = data.chart_1y;

        if (refreshLiveInDev) {
          if (chartHasRenderableData(live)) {
            setFetched(live);
          }
          return;
        }

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

  const overlayKind = chartJsonFolder === "groups" ? "group" : "theme";

  useEffect(() => {
    if (!stockthemesLiveChartPerformanceEnabled()) {
      return;
    }
    if (!chartHasRenderableData(serverChartWithComposition)) {
      return;
    }

    let cancelled = false;
    const refresh = () => {
      fetchChartSidecar(overlayKind, slug, undefined, { live: true })
        .then((sidecar) => {
          if (cancelled || !sidecar?.performance?.dates?.length) return;
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
  }, [slug, overlayKind, serverChartFetchSig, serverChartWithComposition]);

  return (
    <>
      <Chart1yPanel
        chart1y={chart1y}
        compositionMetaByTicker={compositionMetaByTicker}
        performanceTitle={performanceTitle}
        compositionLegendShowSeriesBadge={compositionLegendShowSeriesBadge}
        benchmarkPerformance={benchmarkPerformance}
      />
      {!chart1y && fetchError ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #888)",
            maxWidth: 560,
            marginTop: 8,
          }}
        >
          {stockthemesDevBuildHintsEnabled()
            ? chartFetchErrorDevMessage(fetchError, lastFetchUrl ?? undefined)
            : CHART_FETCH_ERROR_PROD}
        </p>
      ) : null}
      {!chart1y && !fetchError && noChartInPayload ? (
        <p style={{ fontSize: 14, color: "var(--text-secondary, #888)", maxWidth: 560, marginTop: 8 }}>
          {stockthemesDevBuildHintsEnabled() ? CHART_MISSING_IN_PAYLOAD_DEV : CHART_MISSING_IN_PAYLOAD_PROD}
        </p>
      ) : null}
    </>
  );
}
