"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import type { CompositionMeta } from "@/lib/constituentMeta";
import { isSuspiciousChartPerformanceCliff, sanitizeChartPerformanceForDisplay } from "@/lib/chartPerformanceSanity";
import { fetchChartSidecar } from "@/lib/chartSidecar";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";

import {
  stockthemesBrowserFetchCache,
  priceReturnsBrowserCacheBusterQuery,
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
import { groupCompositionNeedsLiveRefresh } from "@/lib/chart1yRenderable";
import { priceReturnMetric } from "@/lib/constituentPriceReturns";
import {
  extendCompositionIndexedWithLiveDayReturns,
  liveDayReturnsStructuralKey,
} from "@/lib/extendCompositionLiveTail";
import {
  stockthemesLiveChartPerformanceEnabled,
  stockthemesLiveCompositionEnabled,
  stockthemesLiveHydrationDisabled,
  stockthemesLivePriceReturnsEnabled,
} from "@/lib/stockthemesClientConfig";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

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
  /** Enables period toolbar; uses manifest dates already on the page (no extra fetch). */
  selectedDates?: ManifestSelectedDateV0[];
  /** Group pages: manifest/detail theme count; triggers CDN composition refresh when chart lags. */
  expectedCompositionSeriesCount?: number;
};

/**
 * Static export may embed detail JSON from build time; CDN can be newer (e.g. charts added later).
 * When the server snapshot has no drawable chart, fetch themes/… or groups/… in the browser.
 *
 * Also: when the build embeds `performance` but not `composition_indexed` (themes strip composition
 * from Flight via `themeChartPerformanceSeed`), we fetch once and merge composition from the bucket
 * so the Performance / Composition toggle can appear without rebuilding the site.
 *
 * Theme and group composition refresh are independent of `DISABLE_LIVE_HYDRATE` when
 * `LIVE_COMPOSITION` is on (R2 has no egress fees; price_returns sidecars omit chart_1y).
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
  selectedDates,
  expectedCompositionSeriesCount,
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

  /** Live 1D % by ticker — extends composition when ticker chart sidecars still lag EOD. */
  const liveDayReturnPctByTicker = useMemo(() => {
    if (!stockthemesLivePriceReturnsEnabled() || chartJsonFolder !== "themes") {
      return undefined;
    }
    const out: Record<string, number> = {};
    for (const c of liveDetail?.constituents ?? []) {
      const ticker = String(c.ticker || "").trim().toUpperCase();
      const dayReturn = priceReturnMetric(c, "1D");
      if (!ticker || dayReturn == null) continue;
      out[ticker] = dayReturn;
    }
    return Object.keys(out).length ? out : undefined;
  }, [liveDetail?.constituents, chartJsonFolder]);
  const liveDayReturnsKey = liveDayReturnsStructuralKey(liveDayReturnPctByTicker);

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
      const sanitizedLive = sanitizeChartPerformanceForDisplay(livePerformance);
      if (sanitizedLive && !isSuspiciousChartPerformanceCliff(sanitizedLive, base.performance)) {
        base = { ...base, performance: sanitizedLive } satisfies ThemeChart1yV0;
      }
    }
    const sessionIso =
      base?.performance?.dates?.at(-1) ??
      livePerformance?.dates?.at(-1) ??
      sc?.performance?.dates?.at(-1);
    return extendCompositionIndexedWithLiveDayReturns(
      base,
      liveDayReturnPctByTicker,
      sessionIso,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- structural keys (not object identity) keep stable `chart1y`; refs hold latest payloads
  }, [serverKey, fetchedKey, livePerfKey, liveDayReturnsKey]);

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
    const refreshGroupChartFromCdn =
      chartJsonFolder === "groups" &&
      chartHasRenderableData(serverChartWithComposition) &&
      stockthemesLiveChartPerformanceEnabled() &&
      !stockthemesLiveHydrationDisabled();
    const refreshGroupCompositionFromCdn =
      chartJsonFolder === "groups" &&
      stockthemesLiveCompositionEnabled() &&
      chartHasRenderableData(serverChartWithComposition) &&
      groupCompositionNeedsLiveRefresh(serverChartWithComposition, expectedCompositionSeriesCount);
    /**
     * Pages build sets DISABLE_LIVE_HYDRATE=1 but LIVE_COMPOSITION=1 — still need one full JSON pull.
     * Skipped when `compositionLive`: `useLiveThemeDetailPrices` already pulls the same theme JSON
     * (composition + earnings schedule), so fetching here duplicates that payload.
     */
    const refreshThemeCompositionFromCdn =
      chartJsonFolder === "themes" &&
      stockthemesLiveCompositionEnabled() &&
      needCompositionOnly &&
      !compositionLive;

    if (
      stockthemesLiveHydrationDisabled() &&
      !refreshGroupCompositionFromCdn &&
      !refreshThemeCompositionFromCdn
    ) {
      return;
    }

    if (
      !needFullChart &&
      !needCompositionOnly &&
      !refreshLiveInDev &&
      !refreshGroupChartFromCdn &&
      !refreshGroupCompositionFromCdn &&
      !refreshThemeCompositionFromCdn
    ) {
      return;
    }

    let cancelled = false;
    // Same cache bucket as `useLiveThemeDetailPrices`: a different `ts` on the same URL
    // costs a second full detail payload instead of a browser cache hit.
    const url = `${dataBaseUrl}/${chartJsonFolder}/${encodeURIComponent(slug)}.json?${priceReturnsBrowserCacheBusterQuery()}`;
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

        if (refreshGroupCompositionFromCdn) {
          if (hasComposition(live)) {
            setFetched(live);
          }
          return;
        }

        if (refreshLiveInDev || refreshGroupChartFromCdn) {
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
  }, [
    slug,
    dataBaseUrl,
    serverChartFetchSig,
    chartJsonFolder,
    expectedCompositionSeriesCount,
    compositionLive,
  ]);

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
          const baseline = serverChartWithComposition?.performance;
          const sidecarSource = String(sidecar.performance.source ?? "");
          const baselineSource = String(baseline?.source ?? "");
          if (
            sidecarSource.includes("historical_market_cap") &&
            baselineSource.includes("theme_chart")
          ) {
            return;
          }
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
  }, [slug, overlayKind, serverChartFetchSig, serverChartWithComposition]);

  return (
    <>
      <Chart1yPanel
        chart1y={chart1y}
        compositionMetaByTicker={compositionMetaByTicker}
        performanceTitle={performanceTitle}
        compositionLegendShowSeriesBadge={compositionLegendShowSeriesBadge}
        benchmarkPerformance={benchmarkPerformance}
        selectedDates={selectedDates}
        sidecarEntity={{ kind: overlayKind, slug }}
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
