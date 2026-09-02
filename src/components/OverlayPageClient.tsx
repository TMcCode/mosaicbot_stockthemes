"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OverlayAddCombobox, type OverlayPick } from "@/components/OverlayAddCombobox";
import type { OverlayChartSeries } from "@/components/OverlayMultiChart";
import { OverlayFactorSpreadControls } from "@/components/OverlayFactorSpreadControls";
import { OverlaySectorEtfControls } from "@/components/OverlaySectorEtfControls";
import chartLegendStyles from "@/components/Chart1yPanel.module.css";
import {
  fetchChartSidecar,
  overlayItemKey,
  parseOverlayItemKey,
} from "@/lib/chartSidecar";
import {
  etSessionIsoDay,
  maybeExtendIndexedPerformanceFromLiveDayReturn,
} from "@/lib/extendCompositionLiveTail";
import { parseCompareThemesJson } from "@/lib/mergeLiveCompareData";
import { loadFactorTimeseries } from "@/lib/loadFactorTimeseries";
import { OVERLAY_CHART_PALETTE } from "@/lib/overlayChartPalette";
import {
  factorsFromSearchParams,
  mapOverlayFactorSpreadOptions,
  mergeFactorTimeseriesIntoCatalog,
  overlayFactorSpreadItemKey,
  type OverlayFactorSpreadCatalogEntry,
  type OverlayFactorSpreadOption,
} from "@/lib/overlayFactorSpreads";
import {
  dayReturnPctByOverlayKeyFromCompareBundles,
  dayReturnPctForTickerFromPriceReturnsSidecar,
  parseCompareGroupsJson,
  primaryThemeSlugForTicker,
} from "@/lib/overlayItemLiveTail";
import {
  mapOverlaySectorEtfCatalog,
  overlaySectorItemKey,
  spyDayReturnPctFromEtfBenchmarks,
  type OverlaySectorEtfCatalogEntry,
} from "@/lib/overlaySectorEtfs";
import { parseSpySnapshotJson } from "@/lib/parseSpySnapshot";
import {
  buildThemeTickersPreviewMapFromSearchIndex,
  loadSiteSearchEngine,
} from "@/lib/siteSearchHits";
import { applyShortThemePerformanceDisplay } from "@/lib/shortThemeChart";
import {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  OVERLAY_STANDARD_PERIODS,
  sliceAndRebaseIndexedPerformance,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/sliceIndexedChart";
import {
  priceReturnsBrowserCacheBusterQuery,
  priceReturnsRevalidateSeconds,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesLiveChartPerformanceEnabled } from "@/lib/stockthemesClientConfig";
import {
  stockthemesBrowserSidecarFetchBase,
  stockthemesPublicDataBase,
} from "@/lib/stockthemesPublicBase";
import { parseThemePriceReturnsSidecar } from "@/lib/liveThemeDetailStore";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";
import type { FactorSpreadsV0 } from "@/types/factor_spreads.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import pageStyles from "@/app/page.module.css";

import styles from "./OverlayPageClient.module.css";

const OverlayMultiChart = dynamic(
  () => import("@/components/OverlayMultiChart").then((mod) => mod.OverlayMultiChart),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: 420 }} aria-busy="true" aria-label="Loading overlay chart" />
    ),
  },
);

const MAX_SERIES = 12;

function isStandardPeriod(p: OverlayChartPeriod): p is OverlayStandardPeriod {
  return (OVERLAY_STANDARD_PERIODS as readonly string[]).includes(p);
}

type LoadedSeries = {
  key: string;
  kind: "theme" | "group" | "ticker";
  slug: string;
  name: string;
  rawPerformance: ChartPerformanceV0;
  loading: boolean;
  error?: string;
};

type GroupLegendMeta = {
  spySector?: string;
  themeCount?: number;
};

type Props = {
  eyebrow: string;
  selectedDates?: ManifestSelectedDateV0[];
  benchmarkPerformance?: ChartPerformanceV0;
  groupLegendMetaBySlug?: Record<string, GroupLegendMeta>;
  sectorEtfCatalog?: Record<string, OverlaySectorEtfCatalogEntry>;
  factorSpreadOptions?: OverlayFactorSpreadOption[];
};

function normalizeEventKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function itemsFromSearchParams(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("items");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SERIES);
}

function sectorsFromSearchParams(
  searchParams: URLSearchParams,
  catalog: Record<string, OverlaySectorEtfCatalogEntry>,
): string[] {
  const raw = searchParams.get("sectors");
  if (!raw) return [];
  const allowed = new Set(Object.keys(catalog));
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((t) => allowed.has(t));
}

export function OverlayPageClient({
  eyebrow,
  selectedDates,
  benchmarkPerformance,
  groupLegendMetaBySlug = {},
  sectorEtfCatalog = {},
  factorSpreadOptions = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  const availableSectorTickers = useMemo(
    () => new Set(Object.keys(sectorEtfCatalog)),
    [sectorEtfCatalog],
  );
  const allowedFactorIds = useMemo(
    () => new Set(factorSpreadOptions.map((o) => o.factorId)),
    [factorSpreadOptions],
  );

  const [items, setItems] = useState<LoadedSeries[]>([]);
  const [themeTickersPreviewBySlug, setThemeTickersPreviewBySlug] = useState<Record<string, string>>(
    {},
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showSectorEtfs, setShowSectorEtfs] = useState(
    () => sectorsFromSearchParams(searchParams, sectorEtfCatalog).length > 0,
  );
  const [selectedSectorTickers, setSelectedSectorTickers] = useState<string[]>(() =>
    sectorsFromSearchParams(searchParams, sectorEtfCatalog),
  );
  const [showFactorSpreads, setShowFactorSpreads] = useState(
    () => factorsFromSearchParams(searchParams, allowedFactorIds).length > 0,
  );
  const [selectedFactorIds, setSelectedFactorIds] = useState<string[]>(() =>
    factorsFromSearchParams(searchParams, allowedFactorIds),
  );
  const [liveSectorCatalog, setLiveSectorCatalog] = useState<Record<
    string,
    OverlaySectorEtfCatalogEntry
  > | null>(null);
  const [liveFactorOptions, setLiveFactorOptions] = useState<OverlayFactorSpreadOption[] | null>(
    null,
  );
  const [factorCatalog, setFactorCatalog] = useState<Record<
    string,
    OverlayFactorSpreadCatalogEntry
  > | null>(null);
  const [factorTimeseriesLoading, setFactorTimeseriesLoading] = useState(false);
  const [liveBenchmarkPerformance, setLiveBenchmarkPerformance] = useState<ChartPerformanceV0 | null>(
    null,
  );
  const [liveSpyDayReturnPct, setLiveSpyDayReturnPct] = useState<number | null>(null);
  /** Live 1D % by overlay item key (`theme:…` / `group:…` / `ticker:…`) for session-day chart tails. */
  const [liveItemDayReturnPctByKey, setLiveItemDayReturnPctByKey] = useState<Record<string, number>>(
    {},
  );

  const activeSectorCatalog = liveSectorCatalog ?? sectorEtfCatalog;
  const activeBenchmarkPerformance = liveBenchmarkPerformance ?? benchmarkPerformance;
  const activeFactorOptions = liveFactorOptions ?? factorSpreadOptions;

  const customPeriods = useMemo(() => {
    const rows = selectedDates ?? [];
    return rows
      .map((r) => {
        const key = normalizeEventKey(String(r.day_name || ""));
        const date = String(r.date || "").trim().slice(0, 10);
        if (!key || !date) return null;
        return { key, label: String(r.day_name || key), date };
      })
      .filter((x): x is { key: string; label: string; date: string } => Boolean(x));
  }, [selectedDates]);

  const customAnchorByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customPeriods) m.set(c.key, c.date);
    return m;
  }, [customPeriods]);

  const activeSectorTickers = useMemo(
    () => (showSectorEtfs ? selectedSectorTickers : []),
    [showSectorEtfs, selectedSectorTickers],
  );
  const activeFactorIds = useMemo(
    () => (showFactorSpreads ? selectedFactorIds : []),
    [showFactorSpreads, selectedFactorIds],
  );

  const countedSeries = items.length + activeSectorTickers.length + activeFactorIds.length;
  const maxSectorSelectable = Math.max(0, MAX_SERIES - items.length - activeFactorIds.length);
  const maxFactorSelectable = Math.max(0, MAX_SERIES - items.length - activeSectorTickers.length);

  const syncUrl = useCallback(
    (args: {
      itemKeys: string[];
      sectorTickers: string[];
      sectorsEnabled: boolean;
      factorIds: string[];
      factorsEnabled: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (args.itemKeys.length) params.set("items", args.itemKeys.join(","));
      else params.delete("items");
      if (args.sectorsEnabled && args.sectorTickers.length) {
        params.set("sectors", args.sectorTickers.join(","));
      } else params.delete("sectors");
      if (args.factorsEnabled && args.factorIds.length) {
        params.set("factors", args.factorIds.join(","));
      } else params.delete("factors");
      const qs = params.toString();
      router.replace(qs ? `/overlay?${qs}` : "/overlay", { scroll: false });
    },
    [router, searchParams],
  );

  const loadOne = useCallback(async (pick: OverlayPick) => {
    const key = overlayItemKey(pick.kind, pick.slug);
    abortRef.current.get(key)?.abort();
    const ac = new AbortController();
    abortRef.current.set(key, ac);

    setItems((prev) => {
      const without = prev.filter((p) => p.key !== key);
      return [
        ...without,
        {
          key,
          kind: pick.kind,
          slug: pick.slug,
          name: pick.name,
          rawPerformance: { dates: [], values: [] },
          loading: true,
        },
      ];
    });

    try {
      const sidecar = await fetchChartSidecar(pick.kind, pick.slug, ac.signal, { live: true });
      if (!sidecar) {
        setItems((prev) =>
          prev.map((p) =>
            p.key === key ? { ...p, loading: false, error: "Chart data unavailable" } : p,
          ),
        );
        return;
      }
      const perf = sidecar.performance;
      const values =
        pick.kind === "ticker"
          ? perf.values.map(Number)
          : applyShortThemePerformanceDisplay(sidecar.name, perf.values.map(Number), perf);
      setItems((prev) =>
        prev.map((p) =>
          p.key === key
            ? {
                ...p,
                name: sidecar.name,
                rawPerformance: { ...perf, values },
                loading: false,
                error: undefined,
              }
            : p,
        ),
      );
    } catch {
      if (ac.signal.aborted) return;
      setItems((prev) =>
        prev.map((p) =>
          p.key === key ? { ...p, loading: false, error: "Failed to load chart" } : p,
        ),
      );
    } finally {
      abortRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    const keys = itemsFromSearchParams(searchParams);
    for (const key of keys) {
      const parsed = parseOverlayItemKey(key);
      if (!parsed) continue;
      void loadOne({
        kind: parsed.kind,
        slug: parsed.slug,
        name: parsed.kind === "ticker" ? parsed.slug : parsed.slug,
      });
    }
    // Initial URL hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** One slim etf_benchmarks + spy_snapshot refresh (shared ~5 min bucket). No per-series polls. */
  useEffect(() => {
    if (!stockthemesLiveChartPerformanceEnabled()) return;
    const base = stockthemesPublicDataBase();
    if (!base) return;

    let cancelled = false;
    const refresh = () => {
      const q = priceReturnsBrowserCacheBusterQuery();
      void Promise.all([
        fetch(`${base}/etf_benchmarks.v0.json?${q}`, {
          credentials: "omit",
          cache: stockthemesBrowserFetchCache(),
        }).then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as EtfBenchmarksV0;
        }),
        fetch(`${base}/spy_snapshot.v0.json?${q}`, {
          credentials: "omit",
          cache: stockthemesBrowserFetchCache(),
        }).then(async (res) => {
          if (!res.ok) return null;
          return parseSpySnapshotJson(await res.json());
        }),
      ])
        .then(([etfBundle, spy]) => {
          if (cancelled) return;
          if (etfBundle?.rows?.length) {
            const mapped = mapOverlaySectorEtfCatalog(etfBundle);
            if (Object.keys(mapped).length) setLiveSectorCatalog(mapped);
            setLiveSpyDayReturnPct(spyDayReturnPctFromEtfBenchmarks(etfBundle));
          }
          const spyPerf = spy?.benchmarkPerformance;
          if (spyPerf?.dates?.length && spyPerf?.values?.length) {
            setLiveBenchmarkPerformance(spyPerf);
          }
          const spyMetric1d = spy?.compareReturns?.metrics?.["1D"];
          if (typeof spyMetric1d === "number" && Number.isFinite(spyMetric1d)) {
            setLiveSpyDayReturnPct(spyMetric1d);
          }
        })
        .catch(() => {
          /* keep SSR snapshot on transient CDN errors */
        });
    };

    refresh();
    const id = window.setInterval(refresh, priceReturnsRevalidateSeconds() * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  /** Lazy-load factor timeseries only when Factor Spreads are in use (keeps /overlay light).
   *  Short (~1Y) first for fast chart; long (~5Y) upgrades in the background so 2Y/5Y/LibDay
   *  unlock without blocking first paint. Factors page keeps using short only. */
  useEffect(() => {
    if (!showFactorSpreads && selectedFactorIds.length === 0) return;
    const base = stockthemesPublicDataBase();
    if (!base) return;

    let cancelled = false;
    let hasLong = false;
    setFactorTimeseriesLoading(true);

    const applyCatalog = (
      timeseries: Awaited<ReturnType<typeof loadFactorTimeseries>>,
      spreads: FactorSpreadsV0 | null,
    ) => {
      if (cancelled) return;
      const options = spreads?.rows?.length
        ? mapOverlayFactorSpreadOptions(spreads)
        : activeFactorOptions;
      if (spreads?.rows?.length) setLiveFactorOptions(options);
      if (timeseries) {
        setFactorCatalog(mergeFactorTimeseriesIntoCatalog(options, timeseries));
      }
    };

    const loadSpreads = () =>
      fetch(`${base}/factor_spreads.v0.json?${priceReturnsBrowserCacheBusterQuery()}`, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
      }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as FactorSpreadsV0;
      });

    const refreshShort = () => {
      void Promise.all([loadFactorTimeseries(base, "short"), loadSpreads()])
        .then(([timeseries, spreads]) => {
          // Never replace a loaded long catalog with the short poll (avoids 2Y flicker).
          if (hasLong) {
            if (cancelled) return;
            if (spreads?.rows?.length) {
              setLiveFactorOptions(mapOverlayFactorSpreadOptions(spreads));
            }
            return;
          }
          applyCatalog(timeseries, spreads);
        })
        .catch(() => {
          /* keep prior catalog on transient CDN errors */
        })
        .finally(() => {
          if (!cancelled) setFactorTimeseriesLoading(false);
        });
    };

    const refreshLong = () => {
      void Promise.all([loadFactorTimeseries(base, "long"), loadSpreads()])
        .then(([longTs, spreads]) => {
          if (cancelled || !longTs?.factors || !Object.keys(longTs.factors).length) return;
          hasLong = true;
          applyCatalog(longTs, spreads);
        })
        .catch(() => {
          /* short catalog remains usable if long is missing/unpublished */
        });
    };

    refreshShort();
    refreshLong();
    // Poll spreads / short only — long history is static within a session; live day
    // return extends the tip without re-downloading ~5Y of points every few minutes.
    const id = window.setInterval(refreshShort, priceReturnsRevalidateSeconds() * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // activeFactorOptions intentionally omitted — seed from SSR/live options at enable time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFactorSpreads, selectedFactorIds.length]);

  /**
   * Live session-day tip for chosen themes / groups / tickers (parity with factor spreads).
   * Themes/groups: compare_* 1D. Tickers: constituent 1D from a containing theme's price_returns
   * sidecar (chart sidecars skip intraday by default on price-only publishes).
   */
  const overlayLiveTailKey = useMemo(
    () =>
      items
        .filter((i) => !i.loading && !i.error && i.rawPerformance?.dates?.length)
        .map((i) => i.key)
        .sort()
        .join("\x1e"),
    [items],
  );

  useEffect(() => {
    const loaded = items.filter((i) => !i.loading && !i.error && i.rawPerformance?.dates?.length);
    const themes = loaded.filter((i) => i.kind === "theme");
    const groups = loaded.filter((i) => i.kind === "group");
    const tickers = loaded.filter((i) => i.kind === "ticker");
    const stillLoading = items.some((i) => i.loading);
    if (!themes.length && !groups.length && !tickers.length) {
      // Don't wipe a just-fetched map while a newly added series is still loading.
      if (!stillLoading) {
        setLiveItemDayReturnPctByKey((prev) => (Object.keys(prev).length ? {} : prev));
      }
      return;
    }

    const base = stockthemesPublicDataBase();
    const sidecarBase = stockthemesBrowserSidecarFetchBase() || base;
    if (!base && !sidecarBase) return;

    let cancelled = false;
    let requestId = 0;

    const refresh = () => {
      const id = ++requestId;
      void (async () => {
        const next: Record<string, number> = {};
        const q = priceReturnsBrowserCacheBusterQuery();

        try {
          if ((themes.length || groups.length) && base) {
            const fetches: Promise<unknown>[] = [];
            if (themes.length) {
              fetches.push(
                fetch(`${base}/compare_themes.v0.json?${q}`, {
                  credentials: "omit",
                  cache: stockthemesBrowserFetchCache(),
                }).then(async (res) => (res.ok ? res.json() : null)),
              );
            } else {
              fetches.push(Promise.resolve(null));
            }
            if (groups.length) {
              fetches.push(
                fetch(`${base}/compare_groups.v0.json?${q}`, {
                  credentials: "omit",
                  cache: stockthemesBrowserFetchCache(),
                }).then(async (res) => (res.ok ? res.json() : null)),
              );
            } else {
              fetches.push(Promise.resolve(null));
            }
            const [themesRaw, groupsRaw] = await Promise.all(fetches);
            if (cancelled || id !== requestId) return;
            const mapped = dayReturnPctByOverlayKeyFromCompareBundles(
              parseCompareThemesJson(themesRaw),
              parseCompareGroupsJson(groupsRaw),
            );
            for (const item of themes) {
              const v = mapped[item.key];
              if (typeof v === "number") next[item.key] = v;
            }
            for (const item of groups) {
              const v = mapped[item.key];
              if (typeof v === "number") next[item.key] = v;
            }
          }

          if (tickers.length && sidecarBase) {
            let engine: Awaited<ReturnType<typeof loadSiteSearchEngine>> | null = null;
            try {
              engine = await loadSiteSearchEngine();
            } catch {
              engine = null;
            }
            if (cancelled || id !== requestId) return;

            const themeByTicker = new Map<string, string>();
            const themesNeeded = new Set<string>();
            for (const item of tickers) {
              const themeSlug = primaryThemeSlugForTicker(engine?.index, item.slug);
              if (!themeSlug) continue;
              themeByTicker.set(item.key, themeSlug);
              themesNeeded.add(themeSlug);
            }

            const sidecarByTheme = new Map<
              string,
              ReturnType<typeof parseThemePriceReturnsSidecar>
            >();
            await Promise.all(
              [...themesNeeded].map(async (themeSlug) => {
                try {
                  const res = await fetch(
                    `${sidecarBase}/themes/${encodeURIComponent(themeSlug)}.price_returns.v0.json?${q}`,
                    {
                      credentials: "omit",
                      cache: stockthemesBrowserFetchCache(),
                    },
                  );
                  if (!res.ok) return;
                  const parsed = parseThemePriceReturnsSidecar(await res.json());
                  sidecarByTheme.set(themeSlug, parsed);
                } catch {
                  /* keep prior / skip ticker on transient CDN errors */
                }
              }),
            );
            if (cancelled || id !== requestId) return;

            for (const item of tickers) {
              const themeSlug = themeByTicker.get(item.key);
              if (!themeSlug) continue;
              const dayReturn = dayReturnPctForTickerFromPriceReturnsSidecar(
                sidecarByTheme.get(themeSlug),
                item.slug,
              );
              if (dayReturn != null) next[item.key] = dayReturn;
            }
          }
        } catch {
          /* keep prior live map on transient CDN errors */
          return;
        }

        if (cancelled || id !== requestId) return;
        setLiveItemDayReturnPctByKey((prev) => {
          const prevKeys = Object.keys(prev);
          const nextKeys = Object.keys(next);
          if (
            prevKeys.length === nextKeys.length &&
            nextKeys.every((k) => prev[k] === next[k])
          ) {
            return prev;
          }
          return next;
        });
      })();
    };

    refresh();
    const id = window.setInterval(refresh, priceReturnsRevalidateSeconds() * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // overlayLiveTailKey fingerprints loaded series; items read for kind/slug details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayLiveTailKey]);

  const themeSlugsNeedingPreview = useMemo(
    () =>
      items
        .filter((i) => i.kind === "theme" && !i.loading && !themeTickersPreviewBySlug[i.slug])
        .map((i) => i.slug),
    [items, themeTickersPreviewBySlug],
  );

  useEffect(() => {
    if (!themeSlugsNeedingPreview.length) return;

    let cancelled = false;
    void loadSiteSearchEngine()
      .then((engine) => {
        if (cancelled) return;
        const map = buildThemeTickersPreviewMapFromSearchIndex(engine.index);
        setThemeTickersPreviewBySlug((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const slug of themeSlugsNeedingPreview) {
            if (next[slug]) continue;
            const preview = map.get(slug);
            if (preview) {
              next[slug] = preview;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [themeSlugsNeedingPreview]);

  useEffect(() => {
    const maxSectors = maxSectorSelectable;
    if (selectedSectorTickers.length <= maxSectors) return;
    const next = selectedSectorTickers.slice(0, maxSectors);
    setSelectedSectorTickers(next);
    syncUrl({
      itemKeys: items.map((i) => i.key),
      sectorTickers: next,
      sectorsEnabled: showSectorEtfs,
      factorIds: selectedFactorIds,
      factorsEnabled: showFactorSpreads,
    });
  }, [
    items,
    selectedSectorTickers,
    showSectorEtfs,
    syncUrl,
    maxSectorSelectable,
    selectedFactorIds,
    showFactorSpreads,
  ]);

  useEffect(() => {
    const maxFactors = maxFactorSelectable;
    if (selectedFactorIds.length <= maxFactors) return;
    const next = selectedFactorIds.slice(0, maxFactors);
    setSelectedFactorIds(next);
    syncUrl({
      itemKeys: items.map((i) => i.key),
      sectorTickers: selectedSectorTickers,
      sectorsEnabled: showSectorEtfs,
      factorIds: next,
      factorsEnabled: showFactorSpreads,
    });
  }, [
    items,
    selectedFactorIds,
    showFactorSpreads,
    syncUrl,
    maxFactorSelectable,
    selectedSectorTickers,
    showSectorEtfs,
  ]);

  const selectedKeys = useMemo(() => new Set(items.map((i) => i.key)), [items]);

  const onAdd = useCallback(
    (pick: OverlayPick) => {
      const key = overlayItemKey(pick.kind, pick.slug);
      if (selectedKeys.has(key)) return;
      if (countedSeries >= MAX_SERIES) return;
      const nextKeys = [...items.map((i) => i.key), key];
      syncUrl({
        itemKeys: nextKeys,
        sectorTickers: selectedSectorTickers,
        sectorsEnabled: showSectorEtfs,
        factorIds: selectedFactorIds,
        factorsEnabled: showFactorSpreads,
      });
      void loadOne(pick);
    },
    [
      items,
      loadOne,
      selectedKeys,
      syncUrl,
      countedSeries,
      selectedSectorTickers,
      showSectorEtfs,
      selectedFactorIds,
      showFactorSpreads,
    ],
  );

  const onSectorTickersChange = useCallback(
    (tickers: string[]) => {
      const capped = tickers.slice(0, maxSectorSelectable);
      setSelectedSectorTickers(capped);
      syncUrl({
        itemKeys: items.map((i) => i.key),
        sectorTickers: capped,
        sectorsEnabled: showSectorEtfs,
        factorIds: selectedFactorIds,
        factorsEnabled: showFactorSpreads,
      });
    },
    [
      items,
      maxSectorSelectable,
      showSectorEtfs,
      syncUrl,
      selectedFactorIds,
      showFactorSpreads,
    ],
  );

  const onSectorEnabledChange = useCallback(
    (enabled: boolean) => {
      setShowSectorEtfs(enabled);
      syncUrl({
        itemKeys: items.map((i) => i.key),
        sectorTickers: selectedSectorTickers,
        sectorsEnabled: enabled,
        factorIds: selectedFactorIds,
        factorsEnabled: showFactorSpreads,
      });
    },
    [items, selectedSectorTickers, syncUrl, selectedFactorIds, showFactorSpreads],
  );

  const onFactorIdsChange = useCallback(
    (ids: string[]) => {
      const capped = ids.slice(0, maxFactorSelectable);
      setSelectedFactorIds(capped);
      syncUrl({
        itemKeys: items.map((i) => i.key),
        sectorTickers: selectedSectorTickers,
        sectorsEnabled: showSectorEtfs,
        factorIds: capped,
        factorsEnabled: showFactorSpreads,
      });
    },
    [
      items,
      maxFactorSelectable,
      showFactorSpreads,
      syncUrl,
      selectedSectorTickers,
      showSectorEtfs,
    ],
  );

  const onFactorEnabledChange = useCallback(
    (enabled: boolean) => {
      setShowFactorSpreads(enabled);
      syncUrl({
        itemKeys: items.map((i) => i.key),
        sectorTickers: selectedSectorTickers,
        sectorsEnabled: showSectorEtfs,
        factorIds: selectedFactorIds,
        factorsEnabled: enabled,
      });
    },
    [items, selectedSectorTickers, showSectorEtfs, syncUrl, selectedFactorIds],
  );

  const onRemove = useCallback(
    (key: string) => {
      abortRef.current.get(key)?.abort();
      abortRef.current.delete(key);
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      const nextKeys = items.filter((i) => i.key !== key).map((i) => i.key);
      syncUrl({
        itemKeys: nextKeys,
        sectorTickers: selectedSectorTickers,
        sectorsEnabled: showSectorEtfs,
        factorIds: selectedFactorIds,
        factorsEnabled: showFactorSpreads,
      });
      setItems((prev) => prev.filter((p) => p.key !== key));
    },
    [items, syncUrl, selectedSectorTickers, showSectorEtfs, selectedFactorIds, showFactorSpreads],
  );

  const onRemoveSector = useCallback(
    (ticker: string) => {
      const next = selectedSectorTickers.filter((t) => t !== ticker);
      setSelectedSectorTickers(next);
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(overlaySectorItemKey(ticker));
        return n;
      });
      syncUrl({
        itemKeys: items.map((i) => i.key),
        sectorTickers: next,
        sectorsEnabled: showSectorEtfs,
        factorIds: selectedFactorIds,
        factorsEnabled: showFactorSpreads,
      });
    },
    [items, selectedSectorTickers, showSectorEtfs, syncUrl, selectedFactorIds, showFactorSpreads],
  );

  const onRemoveFactor = useCallback(
    (factorId: string) => {
      const next = selectedFactorIds.filter((id) => id !== factorId);
      setSelectedFactorIds(next);
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(overlayFactorSpreadItemKey(factorId));
        return n;
      });
      syncUrl({
        itemKeys: items.map((i) => i.key),
        sectorTickers: selectedSectorTickers,
        sectorsEnabled: showSectorEtfs,
        factorIds: next,
        factorsEnabled: showFactorSpreads,
      });
    },
    [items, selectedFactorIds, showFactorSpreads, syncUrl, selectedSectorTickers, showSectorEtfs],
  );

  const toggleHidden = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const sessionIso = etSessionIsoDay();

  const resolvedItems = useMemo(() => {
    return items.map((item) => {
      if (item.loading || item.error || !item.rawPerformance?.dates?.length) return item;
      const dayReturnPct = liveItemDayReturnPctByKey[item.key];
      if (dayReturnPct == null) return item;
      const extended = maybeExtendIndexedPerformanceFromLiveDayReturn(
        item.rawPerformance,
        sessionIso,
        dayReturnPct,
      );
      if (!extended || extended === item.rawPerformance) return item;
      return { ...item, rawPerformance: extended };
    });
  }, [items, liveItemDayReturnPctByKey, sessionIso]);

  const resolvedBenchmarkPerformance = useMemo(() => {
    return (
      maybeExtendIndexedPerformanceFromLiveDayReturn(
        activeBenchmarkPerformance,
        sessionIso,
        liveSpyDayReturnPct,
      ) ?? activeBenchmarkPerformance
    );
  }, [activeBenchmarkPerformance, sessionIso, liveSpyDayReturnPct]);

  const resolvedSectorCatalog = useMemo(() => {
    const out: Record<string, OverlaySectorEtfCatalogEntry> = {};
    for (const [ticker, entry] of Object.entries(activeSectorCatalog)) {
      const extended = maybeExtendIndexedPerformanceFromLiveDayReturn(
        entry.performance,
        sessionIso,
        entry.dayReturnPct,
      );
      out[ticker] =
        extended && extended !== entry.performance
          ? { ...entry, performance: extended }
          : entry;
    }
    return out;
  }, [activeSectorCatalog, sessionIso]);

  const resolvedFactorCatalog = useMemo(() => {
    const source = factorCatalog ?? {};
    const out: Record<string, OverlayFactorSpreadCatalogEntry> = {};
    for (const [factorId, entry] of Object.entries(source)) {
      const opt = activeFactorOptions.find((o) => o.factorId === factorId);
      const dayReturnPct = entry.dayReturnPct ?? opt?.dayReturnPct ?? null;
      const extended = maybeExtendIndexedPerformanceFromLiveDayReturn(
        entry.performance,
        sessionIso,
        dayReturnPct,
      );
      out[factorId] =
        extended && extended !== entry.performance
          ? { ...entry, performance: extended, dayReturnPct }
          : { ...entry, dayReturnPct };
    }
    return out;
  }, [factorCatalog, activeFactorOptions, sessionIso]);

  const referenceLastIso = useMemo(() => {
    const ends: string[] = [];
    if (resolvedBenchmarkPerformance?.dates?.length) {
      ends.push(
        String(resolvedBenchmarkPerformance.dates[resolvedBenchmarkPerformance.dates.length - 1]),
      );
    }
    for (const item of resolvedItems) {
      const d = item.rawPerformance?.dates;
      if (d?.length) ends.push(String(d[d.length - 1]));
    }
    if (showSectorEtfs) {
      for (const ticker of activeSectorTickers) {
        const d = resolvedSectorCatalog[ticker]?.performance?.dates;
        if (d?.length) ends.push(String(d[d.length - 1]));
      }
    }
    if (showFactorSpreads) {
      for (const factorId of activeFactorIds) {
        const d = resolvedFactorCatalog[factorId]?.performance?.dates;
        if (d?.length) ends.push(String(d[d.length - 1]));
      }
    }
    const normalized = ends.map((x) => x.trim().slice(0, 10)).filter((x) => x.length >= 10);
    normalized.sort();
    return normalized.at(-1);
  }, [
    resolvedItems,
    resolvedBenchmarkPerformance,
    showSectorEtfs,
    activeSectorTickers,
    resolvedSectorCatalog,
    showFactorSpreads,
    activeFactorIds,
    resolvedFactorCatalog,
  ]);

  const loadedChartPerformances = useMemo((): ChartPerformanceV0[] => {
    const performances: ChartPerformanceV0[] = [];
    if (showBenchmark && resolvedBenchmarkPerformance?.dates?.length) {
      performances.push(resolvedBenchmarkPerformance);
    }
    for (const item of resolvedItems) {
      if (!item.loading && !item.error && item.rawPerformance?.dates?.length) {
        performances.push(item.rawPerformance);
      }
    }
    if (showSectorEtfs) {
      for (const ticker of activeSectorTickers) {
        const perf = resolvedSectorCatalog[ticker]?.performance;
        if (perf?.dates?.length) performances.push(perf);
      }
    }
    if (showFactorSpreads) {
      for (const factorId of activeFactorIds) {
        const perf = resolvedFactorCatalog[factorId]?.performance;
        if (perf?.dates?.length) performances.push(perf);
      }
    }
    return performances;
  }, [
    resolvedItems,
    resolvedBenchmarkPerformance,
    showBenchmark,
    showSectorEtfs,
    activeSectorTickers,
    resolvedSectorCatalog,
    showFactorSpreads,
    activeFactorIds,
    resolvedFactorCatalog,
  ]);

  const supportedPeriods = useMemo(
    () => computeOverlaySupportedPeriods(referenceLastIso, loadedChartPerformances),
    [referenceLastIso, loadedChartPerformances],
  );

  const supportedCustomPeriodKeys = useMemo(
    () =>
      computeOverlaySupportedCustomPeriodKeys(
        loadedChartPerformances,
        customPeriods.map((c) => ({ key: c.key, date: c.date })),
      ),
    [loadedChartPerformances, customPeriods],
  );

  useEffect(() => {
    if (isStandardPeriod(period) && !supportedPeriods.has(period)) {
      setPeriod("1Y");
    } else if (
      !isStandardPeriod(period) &&
      customPeriods.some((c) => c.key === period) &&
      !supportedCustomPeriodKeys.has(period)
    ) {
      setPeriod("1Y");
    }
  }, [period, supportedPeriods, supportedCustomPeriodKeys, customPeriods]);

  const chartSeries = useMemo((): OverlayChartSeries[] => {
    const anchor = isStandardPeriod(period) ? undefined : customAnchorByKey.get(normalizeEventKey(period));
    const out: OverlayChartSeries[] = [];
    let colorIndex = 0;

    resolvedItems.forEach((item) => {
      if (item.loading || item.error || !item.rawPerformance?.dates?.length) return;
      const sliced = sliceAndRebaseIndexedPerformance(
        item.rawPerformance,
        period,
        anchor,
        referenceLastIso,
      );
      if (!sliced) return;
      const tickersPreview =
        item.kind === "theme" ? themeTickersPreviewBySlug[item.slug] : undefined;
      const groupMeta = item.kind === "group" ? groupLegendMetaBySlug[item.slug] : undefined;
      const legendMeta =
        item.kind === "ticker"
          ? item.slug
          : item.kind === "group"
            ? groupMeta?.spySector?.trim() ||
              (groupMeta?.themeCount
                ? `${groupMeta.themeCount} theme${groupMeta.themeCount === 1 ? "" : "s"}`
                : "Group")
            : undefined;
      out.push({
        id: item.key,
        name: item.name,
        kind: item.kind,
        color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
        performance: sliced,
        tickersPreview,
        legendMeta,
      });
      colorIndex += 1;
    });

    if (showSectorEtfs) {
      activeSectorTickers.forEach((ticker) => {
        const entry = resolvedSectorCatalog[ticker];
        const raw = entry?.performance;
        if (!raw?.dates?.length) return;
        const sliced = sliceAndRebaseIndexedPerformance(raw, period, anchor, referenceLastIso);
        if (!sliced) return;
        out.push({
          id: overlaySectorItemKey(ticker),
          name: entry.name,
          kind: "etf",
          color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
          performance: sliced,
          legendMeta: ticker,
        });
        colorIndex += 1;
      });
    }

    if (showFactorSpreads) {
      activeFactorIds.forEach((factorId) => {
        const entry = resolvedFactorCatalog[factorId];
        const raw = entry?.performance;
        if (!raw?.dates?.length) return;
        const sliced = sliceAndRebaseIndexedPerformance(raw, period, anchor, referenceLastIso);
        if (!sliced) return;
        out.push({
          id: overlayFactorSpreadItemKey(factorId),
          name: entry.name,
          kind: "factor",
          color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
          performance: sliced,
          legendMeta: entry.proxy || factorId,
        });
        colorIndex += 1;
      });
    }

    return out;
  }, [
    resolvedItems,
    period,
    customAnchorByKey,
    referenceLastIso,
    themeTickersPreviewBySlug,
    groupLegendMetaBySlug,
    showSectorEtfs,
    activeSectorTickers,
    resolvedSectorCatalog,
    showFactorSpreads,
    activeFactorIds,
    resolvedFactorCatalog,
  ]);

  const benchmarkSliced = useMemo(() => {
    if (!resolvedBenchmarkPerformance) return undefined;
    const anchor = isStandardPeriod(period) ? undefined : customAnchorByKey.get(normalizeEventKey(period));
    return (
      sliceAndRebaseIndexedPerformance(
        resolvedBenchmarkPerformance,
        period,
        anchor,
        referenceLastIso,
      ) ?? undefined
    );
  }, [resolvedBenchmarkPerformance, period, customAnchorByKey, referenceLastIso]);

  const colorByKey = useMemo(() => {
    const m = new Map<string, string>();
    chartSeries.forEach((s) => m.set(s.id, s.color));
    return m;
  }, [chartSeries]);

  return (
    <>
      <div className={`${pageStyles.heroMain} ${pageStyles.heroMainCompare} ${styles.overlayHero}`}>
        <p className={pageStyles.eyebrow}>{eyebrow}</p>
        <h1>Theme compare chart</h1>
        <p className={pageStyles.introLead}>
          Compare up to {MAX_SERIES} themes, groups, tickers, sector SPDRs, or factor spreads on one
          indexed chart.
        </p>

        <div className={styles.toolbar}>
          <div className={styles.toolbarSearch}>
            <OverlayAddCombobox
              selectedKeys={selectedKeys}
              atLimit={countedSeries >= MAX_SERIES}
              onAdd={onAdd}
            />
          </div>
          <div className={styles.benchmarkCluster}>
            <label className={styles.benchmarkToggle}>
              <input
                type="checkbox"
                checked={showBenchmark}
                onChange={(e) => setShowBenchmark(e.target.checked)}
              />
              S&amp;P 500
            </label>
            {availableSectorTickers.size > 0 ? (
              <OverlaySectorEtfControls
                enabled={showSectorEtfs}
                onEnabledChange={onSectorEnabledChange}
                selectedTickers={selectedSectorTickers}
                onSelectedTickersChange={onSectorTickersChange}
                maxSelectable={maxSectorSelectable}
                availableTickers={availableSectorTickers}
              />
            ) : null}
            {activeFactorOptions.length > 0 ? (
              <OverlayFactorSpreadControls
                enabled={showFactorSpreads}
                onEnabledChange={onFactorEnabledChange}
                options={activeFactorOptions}
                selectedFactorIds={selectedFactorIds}
                onSelectedFactorIdsChange={onFactorIdsChange}
                maxSelectable={maxFactorSelectable}
                loading={factorTimeseriesLoading && !factorCatalog}
              />
            ) : null}
          </div>
          <div className={styles.periodRow} role="group" aria-label="Chart period">
            {OVERLAY_STANDARD_PERIODS.map((p) => {
              const disabled = !supportedPeriods.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  className={period === p ? styles.periodBtnActive : styles.periodBtn}
                  disabled={disabled}
                  title={
                    disabled
                      ? "Loaded series do not have enough history for this window yet"
                      : undefined
                  }
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              );
            })}
            {customPeriods.map((c) => {
              const disabled = !supportedCustomPeriodKeys.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  className={period === c.key ? styles.periodBtnActive : styles.periodBtn}
                  disabled={disabled}
                  title={
                    disabled
                      ? `${c.date}: loaded series do not include this date yet`
                      : c.date
                  }
                  onClick={() => setPeriod(c.key)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {(items.length > 0 || activeSectorTickers.length > 0 || activeFactorIds.length > 0) ? (
          <div className={styles.chips} aria-label="Selected series">
            {items.map((item) => (
              <span
                key={item.key}
                className={`${styles.chip} ${item.loading ? styles.chipLoading : ""}`}
              >
                {item.kind === "ticker" ? (
                  <span className={styles.chipLink}>
                    {item.name}
                    {item.loading ? " …" : null}
                  </span>
                ) : (
                  <Link
                    href={
                      item.kind === "group"
                        ? `/groups/${encodeURIComponent(item.slug)}`
                        : `/themes/${encodeURIComponent(item.slug)}`
                    }
                    className={styles.chipLink}
                  >
                    {item.name}
                    {item.loading ? " …" : null}
                  </Link>
                )}
                <button type="button" className={styles.removeBtn} onClick={() => onRemove(item.key)}>
                  Remove
                </button>
              </span>
            ))}
            {activeSectorTickers.map((ticker) => {
              const entry = activeSectorCatalog[ticker];
              if (!entry) return null;
              return (
                <span key={overlaySectorItemKey(ticker)} className={styles.chip}>
                  <span className={styles.chipLink}>{entry.name}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemoveSector(ticker)}
                  >
                    Remove
                  </button>
                </span>
              );
            })}
            {activeFactorIds.map((factorId) => {
              const entry =
                resolvedFactorCatalog[factorId] ??
                activeFactorOptions.find((o) => o.factorId === factorId);
              if (!entry) return null;
              const loading = showFactorSpreads && !resolvedFactorCatalog[factorId]?.performance;
              return (
                <span
                  key={overlayFactorSpreadItemKey(factorId)}
                  className={`${styles.chip} ${loading ? styles.chipLoading : ""}`}
                >
                  <span className={styles.chipLink}>
                    {entry.name}
                    {loading ? " …" : null}
                  </span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemoveFactor(factorId)}
                  >
                    Remove
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <section className={`${pageStyles.section} ${pageStyles.compareSectionTight} ${styles.overlaySection}`}>
      <OverlayMultiChart
        series={chartSeries}
        benchmark={benchmarkSliced}
        hiddenIds={hiddenIds}
        showBenchmark={showBenchmark}
      />

      {chartSeries.length > 0 ? (
        <div className={styles.legend} role="group" aria-label="Series — click to show or hide">
          {chartSeries.map((s) => {
            const rightMeta = s.tickersPreview || s.legendMeta;
            const stackedLegend = Boolean(s.tickersPreview);
            return (
              <button
                key={s.id}
                type="button"
                className={`${chartLegendStyles.legendItemButton} ${!rightMeta ? chartLegendStyles.legendItemButtonTwoCol : ""} ${stackedLegend ? chartLegendStyles.legendItemButtonStacked : ""} ${hiddenIds.has(s.id) ? chartLegendStyles.legendItemMuted : ""}`}
                aria-pressed={!hiddenIds.has(s.id)}
                onClick={() => toggleHidden(s.id)}
              >
                <span className={chartLegendStyles.swatch} style={{ background: colorByKey.get(s.id) }} />
                <span className={chartLegendStyles.legendNameCell}>
                  <span className={chartLegendStyles.legendLabel}>{s.name}</span>
                </span>
                {rightMeta ? (
                  <span className={chartLegendStyles.legendTickers}>{rightMeta}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {items.some((i) => i.error) ? (
        <p className={styles.errorLine}>
          Some selections could not load chart data (try again after the next data publish).
        </p>
      ) : null}
      </section>
    </>
  );
}
