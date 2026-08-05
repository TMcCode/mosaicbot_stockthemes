import type { ChartPerformanceV0 } from "@/types/chart.v0";

/** ISO date prefix YYYY-MM-DD for string compare */
function monthFirstIsoFromAnchor(anchorIso: string): string {
  const day = anchorIso.trim().slice(0, 10);
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return day;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

/**
 * First index in `dates` on or after the first calendar day of the month containing the last date.
 * `dates` must be ISO YYYY-MM-DD aligned with `values`.
 */
export function indexMonthToDateStart(dates: string[], valuesLength: number): number {
  if (!dates.length || dates.length !== valuesLength) return -1;
  const last = dates[dates.length - 1]?.trim().slice(0, 10);
  if (!last || last.length < 10) return -1;
  const monthFirst = monthFirstIsoFromAnchor(last);
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i].trim().slice(0, 10);
    if (d.length >= 10 && d >= monthFirst) return i;
  }
  return -1;
}

function yearFirstFromAnchorIso(anchorIso: string): string {
  const day = anchorIso.trim().slice(0, 10);
  if (day.length < 10) return day;
  return `${day.slice(0, 4)}-01-01`;
}

/** First index on or after Jan 1 of the calendar year of the last series date. */
function indexYearToDateStart(dates: string[], valuesLength: number): number {
  if (!dates.length || dates.length !== valuesLength) return -1;
  const last = dates[dates.length - 1]?.trim().slice(0, 10);
  if (!last || last.length < 10) return -1;
  const y1 = yearFirstFromAnchorIso(last);
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i].trim().slice(0, 10);
    if (d.length >= 10 && d >= y1) return i;
  }
  return -1;
}

/** First index on/after last_date minus N calendar months (matches chart toolbar 1M). */
function indexCalendarMonthsAgoStart(
  dates: string[],
  valuesLength: number,
  months: number,
): number {
  if (!dates.length || dates.length !== valuesLength || months < 1) return -1;
  const last = dates[dates.length - 1]?.trim().slice(0, 10);
  if (!last || last.length < 10) return -1;
  const d = new Date(`${last}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return -1;
  d.setUTCMonth(d.getUTCMonth() - months);
  const anchor = d.toISOString().slice(0, 10);
  for (let i = 0; i < dates.length; i++) {
    const day = dates[i].trim().slice(0, 10);
    if (day.length >= 10 && day >= anchor) return i;
  }
  return -1;
}

export type ChartPerfReturns = {
  d1?: number;
  d10?: number;
  m1?: number;
  mtd?: number;
  ytd?: number;
  /** ~1Y chart window: last / first indexed level (matches Compare ``Period``). */
  y1?: number;
};

/**
 * 1D / 10D / 1M / MTD / YTD / chart-window return from chart_1y.performance indexed levels.
 * MTD/YTD use first trading point on or after month/year start of the **last** series date.
 * 1M uses first trading point on or after last_date minus one calendar month (chart toolbar).
 */
export function computePerfFromChartPerformance(perf: ChartPerformanceV0 | undefined): ChartPerfReturns {
  const values = perf?.values;
  const dates = perf?.dates;
  if (!Array.isArray(values) || values.length < 2) return {};

  const last = Number(values[values.length - 1]);
  const first = Number(values[0]);
  const prev1 = Number(values[values.length - 2]);
  const prev10 = Number(values[Math.max(0, values.length - 11)]);

  const d1 =
    Number.isFinite(last) && Number.isFinite(prev1) && prev1 !== 0 ? ((last / prev1) - 1) * 100 : undefined;
  const d10 =
    Number.isFinite(last) && Number.isFinite(prev10) && prev10 !== 0
      ? ((last / prev10) - 1) * 100
      : undefined;

  let y1: number | undefined;
  if (Number.isFinite(last) && Number.isFinite(first) && first !== 0) {
    y1 = ((last / first) - 1) * 100;
  }

  let m1: number | undefined;
  let mtd: number | undefined;
  let ytd: number | undefined;
  if (Array.isArray(dates) && dates.length === values.length) {
    const i1m = indexCalendarMonthsAgoStart(dates, values.length, 1);
    if (i1m >= 0) {
      const base = Number(values[i1m]);
      if (Number.isFinite(last) && Number.isFinite(base) && base !== 0) {
        m1 = ((last / base) - 1) * 100;
      }
    }
    const im = indexMonthToDateStart(dates, values.length);
    if (im >= 0) {
      const base = Number(values[im]);
      if (Number.isFinite(last) && Number.isFinite(base) && base !== 0) {
        mtd = ((last / base) - 1) * 100;
      }
    }
    const iy = indexYearToDateStart(dates, values.length);
    if (iy >= 0) {
      const baseY = Number(values[iy]);
      if (Number.isFinite(last) && Number.isFinite(baseY) && baseY !== 0) {
        ytd = ((last / baseY) - 1) * 100;
      }
    }
  }

  return { d1, d10, m1, mtd, ytd, y1 };
}
