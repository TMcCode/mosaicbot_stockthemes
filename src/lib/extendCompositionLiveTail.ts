import type { ChartCompositionSeriesV0, ThemeChart1yV0 } from "@/types/chart.v0";

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
