import {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  sliceAndRebaseIndexedPerformance,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/sliceIndexedChart";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

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
