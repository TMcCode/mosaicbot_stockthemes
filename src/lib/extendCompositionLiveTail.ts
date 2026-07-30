import type { ChartCompositionSeriesV0, ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";

function isoDay(raw: string | undefined): string {
  return String(raw || "").trim().slice(0, 10);
}

function roundIndexed(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Extend (or refresh) one indexed composition series with the live session day return.
 * ``dayReturnPct`` is close-to-now 1D % from ``price_returns`` (long-side stock move).
 */
export function extendCompositionSeriesWithLiveDayReturn(
  series: ChartCompositionSeriesV0,
  sessionIso: string,
  dayReturnPct: number,
): ChartCompositionSeriesV0 {
  const session = isoDay(sessionIso);
  const dates = series.dates;
  const values = series.values;
  if (!session || !dates?.length || !values?.length) return series;
  if (!Number.isFinite(dayReturnPct)) return series;

  const n = Math.min(dates.length, values.length);
  if (n < 1) return series;

  const lastDate = isoDay(dates[n - 1]);
  if (!lastDate || lastDate > session) return series;

  const factor = 1 + dayReturnPct / 100;
  if (!Number.isFinite(factor)) return series;

  if (lastDate < session) {
    const base = Number(values[n - 1]);
    if (!Number.isFinite(base)) return series;
    return {
      ...series,
      dates: [...dates.slice(0, n), session],
      values: [...values.slice(0, n), roundIndexed(base * factor)],
    };
  }

  // Already on the session day: recompute from prior close so poll updates don't compound.
  if (n < 2) return series;
  const base = Number(values[n - 2]);
  if (!Number.isFinite(base)) return series;
  const nextValues = values.slice(0, n);
  nextValues[n - 1] = roundIndexed(base * factor);
  return {
    ...series,
    dates: dates.slice(0, n),
    values: nextValues,
  };
}

/**
 * Same session-day append/refresh for overlay / benchmark indexed performance lines.
 */
export function extendIndexedPerformanceWithLiveDayReturn(
  performance: ChartPerformanceV0,
  sessionIso: string,
  dayReturnPct: number,
): ChartPerformanceV0 {
  const next = extendCompositionSeriesWithLiveDayReturn(
    {
      ticker: "",
      dates: performance.dates,
      values: performance.values,
    },
    sessionIso,
    dayReturnPct,
  );
  if (next.dates === performance.dates && next.values === performance.values) {
    return performance;
  }
  return { ...performance, dates: next.dates, values: next.values };
}

/**
 * True when ``dayReturnPct`` matches the last completed day-to-day move on the series.
 * Used to avoid inventing a "today" point from a stale completed-day 1D metric.
 */
export function dayReturnMatchesLastCompletedMove(
  performance: ChartPerformanceV0 | undefined,
  dayReturnPct: number,
  epsilonPct = 0.05,
): boolean {
  const values = performance?.values;
  if (!values || values.length < 2 || !Number.isFinite(dayReturnPct)) return false;
  const prior = Number(values[values.length - 2]);
  const last = Number(values[values.length - 1]);
  if (!Number.isFinite(prior) || !Number.isFinite(last) || prior === 0) return false;
  const lastMovePct = (last / prior - 1) * 100;
  return Math.abs(lastMovePct - dayReturnPct) <= epsilonPct;
}

/**
 * Append/refresh today's point when 1D looks live (differs from the last completed move).
 */
export function maybeExtendIndexedPerformanceFromLiveDayReturn(
  performance: ChartPerformanceV0 | undefined,
  sessionIso: string | undefined,
  dayReturnPct: number | null | undefined,
): ChartPerformanceV0 | undefined {
  if (!performance?.dates?.length || !performance.values?.length) return performance;
  const session = isoDay(sessionIso);
  if (!session || dayReturnPct == null || !Number.isFinite(dayReturnPct)) return performance;
  const lastDate = isoDay(String(performance.dates[performance.dates.length - 1] ?? ""));
  if (!lastDate || lastDate > session) return performance;
  if (lastDate === session) {
    return extendIndexedPerformanceWithLiveDayReturn(performance, session, dayReturnPct);
  }
  if (dayReturnMatchesLastCompletedMove(performance, dayReturnPct)) return performance;
  return extendIndexedPerformanceWithLiveDayReturn(performance, session, dayReturnPct);
}

/**
 * Append/refresh today's point on theme composition lines using live constituent 1D %.
 * Session date should match the live theme performance tail (e.g. 2026-07-24).
 */
export function extendCompositionIndexedWithLiveDayReturns(
  chart1y: ThemeChart1yV0 | undefined,
  dayReturnPctByTicker: Record<string, number> | undefined,
  sessionIso: string | undefined,
): ThemeChart1yV0 | undefined {
  const comp = chart1y?.composition_indexed;
  const session = isoDay(sessionIso);
  if (!chart1y || !comp?.series?.length || !session || !dayReturnPctByTicker) {
    return chart1y;
  }

  let changed = false;
  const series = comp.series.map((row) => {
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker || !(ticker in dayReturnPctByTicker)) return row;
    const dayReturnPct = dayReturnPctByTicker[ticker];
    const next = extendCompositionSeriesWithLiveDayReturn(row, session, dayReturnPct);
    if (next !== row) changed = true;
    return next;
  });

  if (!changed) return chart1y;
  return {
    ...chart1y,
    composition_indexed: { ...comp, series },
  };
}

/** Stable key for live 1D map so chart memos update when returns change. */
export function liveDayReturnsStructuralKey(
  dayReturnPctByTicker: Record<string, number> | undefined,
): string {
  if (!dayReturnPctByTicker) return "";
  return Object.keys(dayReturnPctByTicker)
    .sort()
    .map((ticker) => `${ticker}:${dayReturnPctByTicker[ticker]}`)
    .join("\x1e");
}

/** America/New_York calendar day as YYYY-MM-DD (overlay session anchor). */
export function etSessionIsoDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}
