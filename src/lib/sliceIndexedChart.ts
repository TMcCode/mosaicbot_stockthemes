import type { ChartPerformanceV0 } from "@/types/chart.v0";

export type OverlayStandardPeriod = "1W" | "1M" | "YTD" | "1Y" | "2Y" | "5Y";

export const OVERLAY_STANDARD_PERIODS: OverlayStandardPeriod[] = [
  "1W",
  "1M",
  "YTD",
  "1Y",
  "2Y",
  "5Y",
];

export function hasIndexedPerformanceFromAnchor(
  perf: ChartPerformanceV0 | undefined,
  anchorIso: string,
): boolean {
  const dates = perf?.dates;
  if (!Array.isArray(dates) || dates.length < 2) return false;
  const anchor = isoDay(anchorIso);
  const first = isoDay(String(dates[0] || ""));
  return first <= anchor;
}

/** Enable 2Y/5Y when every loaded series has data back to the period anchor. */
export function computeOverlaySupportedPeriods(
  referenceLastIso: string | undefined,
  performances: ChartPerformanceV0[],
): Set<OverlayStandardPeriod> {
  const supported = new Set<OverlayStandardPeriod>(["1W", "1M", "YTD", "1Y"]);
  if (!referenceLastIso || performances.length === 0) return supported;
  for (const p of ["2Y", "5Y"] as const) {
    const anchor = periodAnchorIso(referenceLastIso, p);
    if (performances.every((perf) => hasIndexedPerformanceFromAnchor(perf, anchor))) {
      supported.add(p);
    }
  }
  return supported;
}

/** Custom selected-date periods (LibDay, IranWar, …) need history through the event date. */
export function computeOverlaySupportedCustomPeriodKeys(
  performances: ChartPerformanceV0[],
  customAnchors: Array<{ key: string; date: string }>,
): Set<string> {
  const supported = new Set<string>();
  if (performances.length === 0) return supported;
  for (const { key, date } of customAnchors) {
    const anchor = isoDay(date);
    if (!anchor) continue;
    if (performances.every((perf) => hasIndexedPerformanceFromAnchor(perf, anchor))) {
      supported.add(key);
    }
  }
  return supported;
}

export type OverlayChartPeriod = OverlayStandardPeriod | string;

function isoDay(raw: string): string {
  return String(raw || "").trim().slice(0, 10);
}

function parseIsoUtc(iso: string): Date | null {
  const day = isoDay(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatIsoUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function subtractCalendarDays(iso: string, days: number): string {
  const d = parseIsoUtc(iso);
  if (!d) return isoDay(iso);
  d.setUTCDate(d.getUTCDate() - days);
  return formatIsoUtc(d);
}

function subtractCalendarMonths(iso: string, months: number): string {
  const d = parseIsoUtc(iso);
  if (!d) return isoDay(iso);
  d.setUTCMonth(d.getUTCMonth() - months);
  return formatIsoUtc(d);
}

function subtractCalendarYears(iso: string, years: number): string {
  const d = parseIsoUtc(iso);
  if (!d) return isoDay(iso);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return formatIsoUtc(d);
}

function yearStartFromLast(lastIso: string): string {
  const y = Number(lastIso.slice(0, 4));
  if (!Number.isFinite(y)) return lastIso;
  return `${String(y).padStart(4, "0")}-01-01`;
}

function firstIndexOnOrAfter(dates: string[], anchorIso: string): number {
  const anchor = isoDay(anchorIso);
  for (let i = 0; i < dates.length; i++) {
    if (isoDay(dates[i]) >= anchor) return i;
  }
  return dates.length - 1;
}

/** Calendar anchor for the period, relative to the series (or shared) last trading day. */
export function periodAnchorIso(
  lastIso: string,
  period: OverlayChartPeriod,
  customAnchorIso?: string,
): string {
  const last = isoDay(lastIso);
  if (period === "1W") return subtractCalendarDays(last, 7);
  if (period === "1M") return subtractCalendarMonths(last, 1);
  if (period === "YTD") return yearStartFromLast(last);
  if (period === "1Y") return subtractCalendarYears(last, 1);
  if (period === "2Y") return subtractCalendarYears(last, 2);
  if (period === "5Y") return subtractCalendarYears(last, 5);
  if (customAnchorIso) return isoDay(customAnchorIso);
  return last;
}

function startIndexForPeriod(
  dates: string[],
  period: OverlayChartPeriod,
  customAnchorIso?: string,
  referenceLastIso?: string,
): number {
  if (!dates.length) return 0;
  const lastDate = referenceLastIso ? isoDay(referenceLastIso) : isoDay(dates[dates.length - 1]);
  const anchor = periodAnchorIso(lastDate, period, customAnchorIso);
  return firstIndexOnOrAfter(dates, anchor);
}

/** Slice a long indexed series and rebase the window start to 100. */
export function sliceAndRebaseIndexedPerformance(
  perf: ChartPerformanceV0 | undefined,
  period: OverlayChartPeriod,
  customAnchorIso?: string,
  referenceLastIso?: string,
): ChartPerformanceV0 | null {
  const dates = perf?.dates;
  const values = perf?.values;
  if (!Array.isArray(dates) || !Array.isArray(values) || dates.length < 2 || values.length < 2) {
    return null;
  }
  const n = Math.min(dates.length, values.length);
  const d = dates.slice(0, n);
  const v = values.slice(0, n);
  const start = startIndexForPeriod(d, period, customAnchorIso, referenceLastIso);
  const slicedDates = d.slice(start);
  const slicedValues = v.slice(start);
  const base = Number(slicedValues[0]);
  if (!Number.isFinite(base) || base === 0) return null;
  const rebased = slicedValues.map((x) => {
    const val = Number(x);
    if (!Number.isFinite(val)) return NaN;
    return Math.round((val / base) * 10_000) / 100;
  });
  if (rebased.some((x) => !Number.isFinite(x))) return null;
  return {
    ...perf,
    dates: slicedDates,
    values: rebased,
  };
}
