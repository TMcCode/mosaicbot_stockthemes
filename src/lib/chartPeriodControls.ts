import {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  hasIndexedPerformanceFromAnchor,
  periodAnchorIso,
  sliceAndRebaseIndexedPerformance,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/sliceIndexedChart";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { OverlayEntityKind } from "@/lib/chartSidecar";

function isoDay(raw: string): string {
  return String(raw || "").trim().slice(0, 10);
}

const SHORT_DETAIL_PERIODS: Set<OverlayChartPeriod> = new Set(["1W", "1M", "YTD", "1Y"]);

/**
 * Embedded theme JSON is ~1Y; 2Y/5Y/custom need the slim chart sidecar when the
 * loaded series cannot yet be sliced from the period anchor.
 *
 * Use the same criterion as period-button enablement (not a strict calendar
 * ``first > anchor`` check): a 5Y sidecar that starts one trading day after the
 * calendar anchor is still enough history and must not keep re-fetching / racing
 * the "unsupported → snap back to 1Y" effect.
 */
export function performanceNeedsExtendedHistory(
  perf: ChartPerformanceV0 | undefined,
  period: OverlayChartPeriod,
  referenceLastIso: string | undefined,
  customAnchorIso: string | undefined,
): boolean {
  if (SHORT_DETAIL_PERIODS.has(period)) return false;
  const dates = perf?.dates;
  if (!dates?.length) return false;
  const ref = referenceLastIso ? isoDay(referenceLastIso) : isoDay(String(dates[dates.length - 1]));
  const anchor = customAnchorIso ? isoDay(customAnchorIso) : periodAnchorIso(ref, period);
  return !hasIndexedPerformanceFromAnchor(perf, anchor);
}

export function mergeExtendedChartPerformance(
  base: ChartPerformanceV0 | undefined,
  extended: ChartPerformanceV0 | undefined,
): ChartPerformanceV0 | undefined {
  if (!extended?.dates?.length) return base;
  if (!base?.dates?.length) return extended;
  const baseFirst = isoDay(String(base.dates[0]));
  const extFirst = isoDay(String(extended.dates[0]));
  const baseLast = isoDay(String(base.dates[base.dates.length - 1]));
  const extLast = isoDay(String(extended.dates[extended.dates.length - 1]));
  // Prefer sidecar when it starts earlier, is longer, or has a newer session tail.
  if (extFirst < baseFirst || extended.dates.length > base.dates.length || extLast > baseLast) {
    return extended;
  }
  return base;
}

export function chart1yWithExtendedPerformance(
  chart1y: ThemeChart1yV0 | undefined,
  extended: ChartPerformanceV0 | undefined,
): ThemeChart1yV0 | undefined {
  if (!chart1y) return chart1y;
  const merged = mergeExtendedChartPerformance(chart1y.performance, extended);
  if (merged === chart1y.performance) return chart1y;
  return { ...chart1y, performance: merged };
}

/** Theme detail composition = stock tickers; group composition = child theme slugs in ``series.ticker``. */
export function compositionSeriesSidecarKind(parentKind: OverlayEntityKind): OverlayEntityKind {
  return parentKind === "group" ? "theme" : "ticker";
}

export function normalizeCompositionSidecarSlug(
  kind: OverlayEntityKind,
  raw: string,
): string {
  const s = raw.trim();
  if (kind === "ticker") return s.toUpperCase();
  if (kind === "theme") return s.toLowerCase();
  return s;
}

export function compositionTickersNeedingExtendedHistory(
  chart1y: ThemeChart1yV0 | undefined,
  period: OverlayChartPeriod,
  referenceLastIso: string | undefined,
  customAnchorIso: string | undefined,
  extendedByTicker?: Record<string, ChartPerformanceV0 | undefined>,
): string[] {
  const series = chart1y?.composition_indexed?.series;
  if (!series?.length) return [];
  const out: string[] = [];
  for (const s of series) {
    if (!s.dates?.length || !s.values?.length) continue;
    const key = s.ticker.trim().toUpperCase();
    const embedded: ChartPerformanceV0 = { dates: s.dates, values: s.values };
    const merged = mergeExtendedChartPerformance(embedded, extendedByTicker?.[key]);
    if (performanceNeedsExtendedHistory(merged, period, referenceLastIso, customAnchorIso)) {
      out.push(key);
    }
  }
  return out;
}

/**
 * Constituent composition lines often lag the live theme performance tail during market hours:
 * price-only publishes update ``chart_1y.performance`` / slim sidecars, but skip ``composition_indexed``.
 * Prefer extending with live constituent 1D % (``extendCompositionIndexedWithLiveDayReturns``);
 * fall back to ticker (or child-theme) chart sidecars when a series still ends before the live reference day.
 */
export function compositionTickersNeedingLiveTail(
  chart1y: ThemeChart1yV0 | undefined,
  referenceLastIso: string | undefined,
  extendedByTicker?: Record<string, ChartPerformanceV0 | undefined>,
): string[] {
  const series = chart1y?.composition_indexed?.series;
  const ref = referenceLastIso ? isoDay(referenceLastIso) : "";
  if (!series?.length || !ref) return [];
  const out: string[] = [];
  for (const s of series) {
    if (!s.dates?.length || !s.values?.length) continue;
    const key = s.ticker.trim().toUpperCase();
    const embedded: ChartPerformanceV0 = { dates: s.dates, values: s.values };
    const merged = mergeExtendedChartPerformance(embedded, extendedByTicker?.[key]);
    const last = isoDay(String(merged?.dates?.[merged.dates.length - 1] ?? ""));
    if (last && last < ref) out.push(key);
  }
  return out;
}

export function chart1yWithExtendedComposition(
  chart1y: ThemeChart1yV0 | undefined,
  extendedByTicker: Record<string, ChartPerformanceV0 | undefined>,
): ThemeChart1yV0 | undefined {
  const comp = chart1y?.composition_indexed;
  if (!comp?.series?.length || Object.keys(extendedByTicker).length === 0) return chart1y;
  let changed = false;
  const series = comp.series.map((s) => {
    const key = s.ticker.trim().toUpperCase();
    const ext = extendedByTicker[key];
    if (!ext?.dates?.length) return s;
    const merged = mergeExtendedChartPerformance(
      { dates: s.dates, values: s.values },
      ext,
    );
    if (!merged || (merged.dates === s.dates && merged.values === s.values)) return s;
    changed = true;
    return { ...s, dates: merged.dates, values: merged.values };
  });
  if (!changed || !chart1y) return chart1y;
  return { ...chart1y, composition_indexed: { ...comp, series } };
}

export const DETAIL_CHART_STANDARD_PERIODS: OverlayStandardPeriod[] = [
  "1W",
  "1M",
  "YTD",
  "1Y",
  "2Y",
  "5Y",
];

export function normalizeChartEventKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

export type ChartCustomPeriod = { key: string; label: string; date: string };

export function chartCustomPeriodsFromManifest(
  selectedDates: ManifestSelectedDateV0[] | undefined,
): ChartCustomPeriod[] {
  const rows = selectedDates ?? [];
  return rows
    .map((r) => {
      const key = normalizeChartEventKey(String(r.day_name || ""));
      const date = String(r.date || "").trim().slice(0, 10);
      if (!key || !date) return null;
      return { key, label: String(r.day_name || key), date };
    })
    .filter((x): x is ChartCustomPeriod => Boolean(x));
}

export function referenceLastIsoFromPerformances(
  performances: Array<ChartPerformanceV0 | undefined>,
): string | undefined {
  const ends: string[] = [];
  for (const perf of performances) {
    const d = perf?.dates;
    if (d?.length) ends.push(String(d[d.length - 1]));
  }
  const normalized = ends.map((x) => x.trim().slice(0, 10)).filter((x) => x.length >= 10);
  normalized.sort();
  return normalized.at(-1);
}

export function chartPeriodWindowLabel(
  period: OverlayChartPeriod,
  customPeriods: ChartCustomPeriod[],
): string {
  if (period === "1W") return "the Past Week";
  if (period === "1M") return "the Past Month";
  if (period === "YTD") return "Year to Date";
  if (period === "1Y") return "the Past Year";
  if (period === "2Y") return "the Past 2 Years";
  if (period === "5Y") return "the Past 5 Years";
  const custom = customPeriods.find((c) => c.key === period);
  if (custom) return `Since ${custom.label}`;
  return "the Selected Period";
}

export function sliceThemeChart1yForPeriod(
  chart1y: ThemeChart1yV0 | undefined,
  period: OverlayChartPeriod,
  customAnchorIso: string | undefined,
  referenceLastIso: string | undefined,
): ThemeChart1yV0 | undefined {
  if (!chart1y) return chart1y;
  const perf = chart1y.performance;
  const slicedPerf =
    perf?.dates?.length && perf?.values?.length
      ? sliceAndRebaseIndexedPerformance(perf, period, customAnchorIso, referenceLastIso)
      : null;

  const comp = chart1y.composition_indexed;
  let composition_indexed = comp;
  if (comp?.series?.length) {
    const series = comp.series.map((s) => {
      if (!s.dates?.length || !s.values?.length) return s;
      const sliced = sliceAndRebaseIndexedPerformance(
        { dates: s.dates, values: s.values },
        period,
        customAnchorIso,
        referenceLastIso,
      );
      if (!sliced) return s;
      return { ...s, dates: sliced.dates, values: sliced.values };
    });
    composition_indexed = { ...comp, series };
  }

  if (!slicedPerf && composition_indexed === comp) return chart1y;
  return {
    ...chart1y,
    ...(slicedPerf ? { performance: slicedPerf } : {}),
    ...(composition_indexed !== comp ? { composition_indexed } : {}),
  };
}

export function sliceBenchmarkForPeriod(
  benchmark: ChartPerformanceV0 | undefined,
  period: OverlayChartPeriod,
  customAnchorIso: string | undefined,
  referenceLastIso: string | undefined,
): ChartPerformanceV0 | undefined {
  if (!benchmark?.dates?.length || !benchmark?.values?.length) return benchmark;
  return (
    sliceAndRebaseIndexedPerformance(benchmark, period, customAnchorIso, referenceLastIso) ??
    benchmark
  );
}

/**
 * Which series gate period-button enablement on theme/group detail charts.
 * SPY benchmark is aligned to the visible window in the canvas and must not
 * disable 2Y/5Y/custom dates when the theme line has full history.
 */
export function chartPerformancesForDetailPeriodSupport(
  chart1y: ThemeChart1yV0 | undefined,
  activeView: "performance" | "composition",
): ChartPerformanceV0[] {
  const out: ChartPerformanceV0[] = [];
  if (activeView === "performance") {
    const perf = chart1y?.performance;
    if (perf?.dates?.length) out.push(perf);
    return out;
  }
  const comp = chart1y?.composition_indexed?.series;
  if (comp?.length) {
    for (const s of comp) {
      if (s.dates?.length && s.values?.length) {
        out.push({ dates: s.dates, values: s.values });
      }
    }
  }
  return out;
}

export {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
};
