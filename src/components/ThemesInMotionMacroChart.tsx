"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChartPeriodToolbar } from "@/components/ChartPeriodToolbar";
import { OverlayMultiChart, type OverlayChartSeries } from "@/components/OverlayMultiChart";
import {
  chartCustomPeriodsFromManifest,
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/chartPeriodControls";
import { OVERLAY_CHART_PALETTE } from "@/lib/overlayChartPalette";
import {
  mapOverlayFactorSpreadOptions,
  mergeFactorTimeseriesIntoCatalog,
  overlayFactorSpreadItemKey,
  type OverlayFactorSpreadCatalogEntry,
  type OverlayFactorSpreadOption,
} from "@/lib/overlayFactorSpreads";
import {
  OVERLAY_SECTOR_SPDR_OPTIONS,
  mapOverlaySectorEtfCatalog,
  overlaySectorItemKey,
  type OverlaySectorEtfCatalogEntry,
} from "@/lib/overlaySectorEtfs";
import {
  MOTION_MACRO_FACTOR_IDS,
  MOTION_MACRO_FACTOR_SHORT_LABELS,
} from "@/lib/motionMacroFactors";
import { loadFactorTimeseries } from "@/lib/loadFactorTimeseries";
import { parseSpySnapshotJson } from "@/lib/parseSpySnapshot";
import { OVERLAY_STANDARD_PERIODS, sliceAndRebaseIndexedPerformance } from "@/lib/sliceIndexedChart";
import {
  priceReturnsBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import {
  stockthemesBrowserSidecarFetchBase,
  stockthemesPublicDataBase,
} from "@/lib/stockthemesPublicBase";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { EtfBenchmarksV0 } from "@/types/etf_benchmarks.v0";
import type { FactorSpreadsV0 } from "@/types/factor_spreads.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import styles from "./ThemesInMotionMacroChart.module.css";

export type MacroChartMode = "sectors" | "factors";

type Props = {
  /** Manifest custom event dates for period toolbar — small; safe to SSR. */
  selectedDates?: ManifestSelectedDateV0[];
};

function browserDataBase(): string | undefined {
  return stockthemesBrowserSidecarFetchBase() ?? stockthemesPublicDataBase();
}

function isStandardPeriod(p: OverlayChartPeriod): p is OverlayStandardPeriod {
  return (OVERLAY_STANDARD_PERIODS as readonly string[]).includes(p);
}

function sectorShortLabel(ticker: string, fullName: string): string {
  const m = fullName.match(/^(.+?)\s*\(/);
  if (m?.[1]?.trim()) return `${m[1].trim()} (${ticker})`;
  return ticker;
}

function lastIsoFromPerf(perf: ChartPerformanceV0 | undefined): string | undefined {
  const d = perf?.dates;
  if (!d?.length) return undefined;
  const day = String(d[d.length - 1] || "").trim().slice(0, 10);
  return day.length >= 10 ? day : undefined;
}

/**
 * Home “Market backdrop” sectors/factors chart.
 * Series are fetched from the public CDN on mount — not SSR’d into home HTML
 * (etf_benchmarks + spy performance alone were ~320KB of RSC payload).
 */
export function ThemesInMotionMacroChart({ selectedDates }: Props) {
  const [mode, setMode] = useState<MacroChartMode>("sectors");
  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [chartHeight, setChartHeight] = useState(480);

  const [sectorEtfCatalog, setSectorEtfCatalog] = useState<
    Record<string, OverlaySectorEtfCatalogEntry>
  >({});
  const [benchmarkPerformance, setBenchmarkPerformance] = useState<
    ChartPerformanceV0 | undefined
  >();
  const [sectorLoading, setSectorLoading] = useState(true);

  const [factorSpreadOptions, setFactorSpreadOptions] = useState<OverlayFactorSpreadOption[]>(
    [],
  );
  const [factorCatalog, setFactorCatalog] = useState<
    Record<string, OverlayFactorSpreadCatalogEntry>
  >({});
  const [factorLoading, setFactorLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 700px)");
    const apply = () => setChartHeight(mq.matches ? 280 : 480);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Sectors + SPY benchmark — one CDN pull when the chart mounts.
  useEffect(() => {
    const base = browserDataBase();
    if (!base) {
      setSectorLoading(false);
      return;
    }

    let cancelled = false;
    setSectorLoading(true);
    const q = priceReturnsBrowserCacheBusterQuery();

    void Promise.all([
      fetch(`${base.replace(/\/$/, "")}/etf_benchmarks.v0.json?${q}`, {
        credentials: "omit",
        cache: stockthemesBrowserFetchCache(),
      }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as EtfBenchmarksV0;
      }),
      fetch(`${base.replace(/\/$/, "")}/spy_snapshot.v0.json?${q}`, {
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
          if (Object.keys(mapped).length) setSectorEtfCatalog(mapped);
        }
        const spyPerf = spy?.benchmarkPerformance;
        if (spyPerf?.dates?.length && spyPerf?.values?.length) {
          setBenchmarkPerformance(spyPerf);
        }
      })
      .catch(() => {
        /* leave empty — hint below */
      })
      .finally(() => {
        if (!cancelled) setSectorLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const customPeriods = useMemo(
    () => chartCustomPeriodsFromManifest(selectedDates),
    [selectedDates],
  );

  const customAnchorByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customPeriods) m.set(c.key, c.date);
    return m;
  }, [customPeriods]);

  const setModeAndReset = useCallback((next: MacroChartMode) => {
    setMode(next);
    setHiddenIds(new Set());
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // Factors — only when that tab is selected (timeseries is large).
  useEffect(() => {
    if (mode !== "factors") return;
    const base = browserDataBase();
    if (!base) return;

    let cancelled = false;
    let hasLong = false;
    setFactorLoading(true);

    const applyCatalog = (
      timeseries: Awaited<ReturnType<typeof loadFactorTimeseries>>,
      spreads: FactorSpreadsV0 | null,
    ) => {
      if (cancelled) return;
      setFactorSpreadOptions((prev) => {
        const options = spreads?.rows?.length
          ? mapOverlayFactorSpreadOptions(spreads)
          : prev;
        if (timeseries) {
          setFactorCatalog(mergeFactorTimeseriesIntoCatalog(options, timeseries));
        }
        return options;
      });
    };

    const loadSpreads = () =>
      fetch(
        `${base.replace(/\/$/, "")}/factor_spreads.v0.json?${priceReturnsBrowserCacheBusterQuery()}`,
        {
          credentials: "omit",
          cache: stockthemesBrowserFetchCache(),
        },
      ).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as FactorSpreadsV0;
      });

    void Promise.all([loadFactorTimeseries(base, "short"), loadSpreads()])
      .then(([timeseries, spreads]) => {
        if (hasLong) return;
        applyCatalog(timeseries, spreads);
      })
      .catch(() => {
        /* keep prior */
      })
      .finally(() => {
        if (!cancelled) setFactorLoading(false);
      });

    void Promise.all([loadFactorTimeseries(base, "long"), loadSpreads()])
      .then(([longTs, spreads]) => {
        if (cancelled || !longTs?.factors || !Object.keys(longTs.factors).length) return;
        hasLong = true;
        applyCatalog(longTs, spreads);
      })
      .catch(() => {
        /* short catalog remains usable */
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const rawPerformances = useMemo((): ChartPerformanceV0[] => {
    const out: ChartPerformanceV0[] = [];
    if (mode === "sectors") {
      for (const opt of OVERLAY_SECTOR_SPDR_OPTIONS) {
        const perf = sectorEtfCatalog[opt.ticker]?.performance;
        if (perf?.dates?.length) out.push(perf);
      }
      return out;
    }
    for (const factorId of MOTION_MACRO_FACTOR_IDS) {
      const perf = factorCatalog[factorId]?.performance;
      if (perf?.dates?.length) out.push(perf);
    }
    return out;
  }, [mode, sectorEtfCatalog, factorCatalog]);

  const referenceLastIso = useMemo(() => {
    const ends = rawPerformances
      .map((p) => lastIsoFromPerf(p))
      .filter((x): x is string => Boolean(x));
    ends.sort();
    return ends.at(-1) ?? lastIsoFromPerf(benchmarkPerformance);
  }, [rawPerformances, benchmarkPerformance]);

  const supportedPeriods = useMemo(
    () => computeOverlaySupportedPeriods(referenceLastIso, rawPerformances),
    [referenceLastIso, rawPerformances],
  );

  const supportedCustomPeriodKeys = useMemo(
    () =>
      computeOverlaySupportedCustomPeriodKeys(
        rawPerformances,
        customPeriods.map((c) => ({ key: c.key, date: c.date })),
      ),
    [rawPerformances, customPeriods],
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

  const periodAnchor = useMemo(() => {
    if (isStandardPeriod(period)) return undefined;
    return customAnchorByKey.get(period);
  }, [period, customAnchorByKey]);

  const chartSeries = useMemo((): OverlayChartSeries[] => {
    const out: OverlayChartSeries[] = [];
    let colorIndex = 0;

    if (mode === "sectors") {
      for (const opt of OVERLAY_SECTOR_SPDR_OPTIONS) {
        const entry = sectorEtfCatalog[opt.ticker];
        const raw = entry?.performance;
        if (!raw?.dates?.length) continue;
        const sliced = sliceAndRebaseIndexedPerformance(
          raw,
          period,
          periodAnchor,
          referenceLastIso,
        );
        if (!sliced) continue;
        out.push({
          id: overlaySectorItemKey(opt.ticker),
          name: sectorShortLabel(opt.ticker, entry?.name || opt.name),
          kind: "etf",
          color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
          performance: sliced,
        });
        colorIndex += 1;
      }
      return out;
    }

    for (const factorId of MOTION_MACRO_FACTOR_IDS) {
      const entry = factorCatalog[factorId];
      const raw = entry?.performance;
      if (!raw?.dates?.length) continue;
      const sliced = sliceAndRebaseIndexedPerformance(
        raw,
        period,
        periodAnchor,
        referenceLastIso,
      );
      if (!sliced) continue;
      const short =
        MOTION_MACRO_FACTOR_SHORT_LABELS[
          factorId as keyof typeof MOTION_MACRO_FACTOR_SHORT_LABELS
        ] ||
        entry?.name ||
        factorId;
      out.push({
        id: overlayFactorSpreadItemKey(factorId),
        name: short,
        kind: "factor",
        color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
        performance: sliced,
      });
      colorIndex += 1;
    }
    return out;
  }, [
    mode,
    sectorEtfCatalog,
    factorCatalog,
    period,
    periodAnchor,
    referenceLastIso,
  ]);

  const benchmarkSliced = useMemo(() => {
    if (mode !== "sectors" || !benchmarkPerformance) return undefined;
    return (
      sliceAndRebaseIndexedPerformance(
        benchmarkPerformance,
        period,
        periodAnchor,
        referenceLastIso,
      ) ?? undefined
    );
  }, [mode, benchmarkPerformance, period, periodAnchor, referenceLastIso]);

  const emptyMessage =
    mode === "factors"
      ? factorLoading
        ? "Loading factor spreads…"
        : "Factor spread series not published yet."
      : sectorLoading
        ? "Loading sector series…"
        : "Sector SPDR series not published yet.";

  return (
    <section className={styles.section} aria-labelledby="motion-macro-chart-heading">
      <div className={styles.titlePeriodRow}>
        <h2 id="motion-macro-chart-heading" className={styles.title}>
          Market backdrop
        </h2>
        <div className={styles.controlsRow}>
          <div className={styles.periodBar}>
            <ChartPeriodToolbar
              period={period}
              onPeriodChange={setPeriod}
              supportedPeriods={supportedPeriods}
              supportedCustomPeriodKeys={supportedCustomPeriodKeys}
              customPeriods={customPeriods}
              variant="overlay"
            />
          </div>
          <div className={styles.toggle} role="group" aria-label="Backdrop series">
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === "sectors" ? styles.toggleBtnActive : ""}`}
              aria-pressed={mode === "sectors"}
              onClick={() => setModeAndReset("sectors")}
            >
              Sectors
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${mode === "factors" ? styles.toggleBtnActive : ""}`}
              aria-pressed={mode === "factors"}
              onClick={() => setModeAndReset("factors")}
            >
              Factors
            </button>
          </div>
        </div>
      </div>

      <div className={styles.chartWrap}>
        {chartSeries.length > 0 ? (
          <OverlayMultiChart
            series={chartSeries}
            benchmark={benchmarkSliced}
            hiddenIds={hiddenIds}
            showBenchmark={mode === "sectors" && Boolean(benchmarkSliced)}
            height={chartHeight}
          />
        ) : (
          <p className={styles.hint}>{emptyMessage}</p>
        )}
      </div>

      {chartSeries.length > 0 ? (
        <div className={styles.legend} role="group" aria-label="Series — click to show or hide">
          {chartSeries.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.legendItem} ${hiddenIds.has(s.id) ? styles.legendItemMuted : ""}`}
              aria-pressed={!hiddenIds.has(s.id)}
              title={s.name}
              onClick={() => toggleHidden(s.id)}
            >
              <span className={styles.swatch} style={{ background: s.color }} />
              <span className={styles.legendLabel}>{s.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
