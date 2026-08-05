import type { ConstituentPriceReturnColumn } from "@/lib/constituentPriceReturns";
import {
  hasConstituentPriceReturns,
  priceReturnMetric,
  resolveConstituentPriceReturnColumns,
} from "@/lib/constituentPriceReturns";
import { inferMarketCapUsd, sortConstituentsByMarketCapDesc } from "@/lib/constituentMeta";
import type { ThemeDetailConstituentV0, ThemeDetailV0 } from "@/types/theme.detail.v0";

const ET_TIMEZONE = "America/New_York";
const ET_YMD_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: ET_TIMEZONE });
const ET_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, month: "numeric" });
const ET_COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIMEZONE,
  month: "numeric",
  day: "numeric",
  year: "2-digit",
});
const ET_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mon) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, mon - 1, d, 12, 0, 0));
}

function etNowParts(now: Date): { year: number; month: number; hour: number; minute: number } {
  const parts = ET_PARTS_FORMATTER.formatToParts(now);
  const pick = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), hour: pick("hour"), minute: pick("minute") };
}

function quarterForMonth(month: number): 1 | 2 | 3 | 4 {
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

function fallbackDateWithYearForQuarter(quarter: 1 | 2 | 3 | 4, nowEtYear: number): string {
  return ET_COMPACT_DATE_FORMATTER.format(quarterEndDateEt(quarter, nowEtYear));
}

function quarterEndDateEt(quarter: 1 | 2 | 3 | 4, year: number): Date {
  if (quarter === 1) return new Date(Date.UTC(year, 5, 30, 12, 0, 0));
  if (quarter === 2) return new Date(Date.UTC(year, 8, 30, 12, 0, 0));
  if (quarter === 3) return new Date(Date.UTC(year, 11, 31, 12, 0, 0));
  return new Date(Date.UTC(year, 2, 31, 12, 0, 0));
}

function isEffectiveReportedInEt(reportDate: Date, bamRaw: string | undefined, now: Date): boolean {
  const bam = String(bamRaw || "").toUpperCase();
  const reportYmdEt = ET_YMD_FORMATTER.format(reportDate);
  const nowYmdEt = ET_YMD_FORMATTER.format(now);
  if (reportYmdEt < nowYmdEt) return true;
  if (reportYmdEt > nowYmdEt) return false;
  // Same ET calendar day:
  // AMC stays "next" through the print day; becomes last the following day.
  if (bam === "AMC" || bam === "AFTERMARKET") return false;
  const { hour, minute } = etNowParts(now);
  const etMinutes = hour * 60 + minute;
  const marketOpenMinutes = 9 * 60 + 30;
  if (bam === "BMO" || bam === "BEFOREMARKET") return etMinutes >= marketOpenMinutes;
  return etMinutes >= marketOpenMinutes;
}

export function formatConstituentPct(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toFixed(2)}%`;
}

function formatQuarterReportDate(
  reportDate: Date | null,
  bamRaw: string | undefined,
  fallbackMmdd: string | null,
  isBmoTodayPartial: boolean,
): string {
  if (!reportDate) return fallbackMmdd ?? "—";
  const label = ET_COMPACT_DATE_FORMATTER.format(reportDate);
  const bam = String(bamRaw || "").toUpperCase();
  const bamLabel = bam === "AFTERMARKET" ? "AMC" : bam === "BEFOREMARKET" ? "BMO" : bam;
  const bamPart = bamLabel ? ` (${bamLabel}${isBmoTodayPartial ? "*" : ""})` : "";
  return `${label}${bamPart}`;
}

export type QuarterEarningsRow = {
  lastReportDateCell: string;
  reportDateCell: string;
  lastQuarterEarningsMoveCell: string;
  earningsPerfCell: string;
  avgAbsRptCell: string;
  intraQtrCell: string;
  sinceQtrRptCell: string;
  earningsPerfIsProvisional: boolean;
  lastQuarterEarningsMoveValue: number | null;
  earningsPerfValue: number | null;
  avgAbsRptValue: number | null;
  intraQtrValue: number | null;
  sinceQtrRptValue: number | null;
};

function finiteOrNull(value: number | undefined | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

export function buildQuarterEarningsRow(
  constituent: ThemeDetailConstituentV0,
  now = new Date(),
): QuarterEarningsRow {
  const nowEt = etNowParts(now);
  const currentQuarter = quarterForMonth(nowEt.month);
  const quarterEnd = quarterEndDateEt(currentQuarter, nowEt.year);
  const quarterHasEnded = ET_YMD_FORMATTER.format(now) > ET_YMD_FORMATTER.format(quarterEnd);
  const fallbackDate = quarterHasEnded
    ? fallbackDateWithYearForQuarter(currentQuarter, nowEt.year)
    : null;
  const lastReport = parseIsoDate(constituent.last_report_date);
  const nextReport = parseIsoDate(constituent.next_report_date);
  const lastInQuarter = lastReport
    ? quarterForMonth(Number(ET_MONTH_FORMATTER.format(lastReport))) === currentQuarter
    : false;
  const nextInQuarter = nextReport
    ? quarterForMonth(Number(ET_MONTH_FORMATTER.format(nextReport))) === currentQuarter
    : false;
  const currentQuarterReport = lastInQuarter ? lastReport : nextInQuarter ? nextReport : null;
  const currentQuarterBam = lastInQuarter
    ? constituent.last_before_after_market
    : nextInQuarter
      ? constituent.next_before_after_market
      : undefined;
  const lastReportDateCell = formatQuarterReportDate(
    lastReport,
    constituent.last_before_after_market,
    null,
    false,
  );
  const hasReported = Boolean(
    lastInQuarter &&
      lastReport &&
      isEffectiveReportedInEt(lastReport, constituent.last_before_after_market, now),
  );
  const reportDateCell = formatQuarterReportDate(
    currentQuarterReport,
    currentQuarterBam,
    fallbackDate,
    Boolean(
      hasReported &&
        currentQuarterReport &&
        ET_YMD_FORMATTER.format(currentQuarterReport) === ET_YMD_FORMATTER.format(now) &&
        String(currentQuarterBam || "").toUpperCase() === "BMO",
    ),
  );
  const isFinalLocked = constituent.last_rpt_is_final === true;
  const finalLstRpt = constituent.last_rpt_final_percent ?? constituent.last_rpt_percent;
  const liveLstRpt = constituent.last_rpt_live_percent;
  const earningsPerfValue = finiteOrNull(isFinalLocked ? finalLstRpt : (liveLstRpt ?? finalLstRpt));
  const earningsPerfIsProvisional = !isFinalLocked;
  const intraQtrValue = finiteOrNull(
    hasReported
      ? constituent.pre_earnings_percent_last_report
      : constituent.since_last_rpt_percent,
  );
  const sinceQtrRptValue = finiteOrNull(hasReported ? constituent.since_last_rpt_percent : null);
  const latestEarningsMove = finiteOrNull(constituent.earnings_percent_last_report);
  const prevEarningsMove = finiteOrNull(constituent.earnings_percent_prev_report);
  const lastQuarterEarningsMoveValue = hasReported
    ? (prevEarningsMove ?? latestEarningsMove)
    : latestEarningsMove;
  const avgAbsRptValue = finiteOrNull(constituent.avg_abs_rpt_percent);
  return {
    lastReportDateCell,
    reportDateCell,
    lastQuarterEarningsMoveCell: formatConstituentPct(lastQuarterEarningsMoveValue),
    earningsPerfCell: hasReported ? formatConstituentPct(earningsPerfValue) : "—",
    avgAbsRptCell: formatConstituentPct(avgAbsRptValue),
    intraQtrCell: formatConstituentPct(intraQtrValue),
    sinceQtrRptCell: hasReported ? formatConstituentPct(sinceQtrRptValue) : "—",
    earningsPerfIsProvisional: hasReported && earningsPerfIsProvisional,
    lastQuarterEarningsMoveValue,
    earningsPerfValue: hasReported ? earningsPerfValue : null,
    avgAbsRptValue,
    intraQtrValue,
    sinceQtrRptValue,
  };
}

function finiteValues(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function average(values: Array<number | null | undefined>): number | null {
  const nums = finiteValues(values);
  if (!nums.length) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function stdDev(values: Array<number | null | undefined>): number | null {
  const nums = finiteValues(values);
  if (!nums.length) return null;
  const avg = nums.reduce((sum, v) => sum + v, 0) / nums.length;
  const variance = nums.reduce((sum, v) => sum + (v - avg) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function positivePercent(values: Array<number | null | undefined>): number | null {
  const nums = finiteValues(values);
  if (!nums.length) return null;
  const positive = nums.filter((v) => v > 0).length;
  return (positive / nums.length) * 100;
}

function median(values: Array<number | null | undefined>): number | null {
  const nums = finiteValues(values).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 0) return (nums[mid - 1] + nums[mid]) / 2;
  return nums[mid];
}

function minValue(values: Array<number | null | undefined>): number | null {
  const nums = finiteValues(values);
  if (!nums.length) return null;
  return Math.min(...nums);
}

function maxValue(values: Array<number | null | undefined>): number | null {
  const nums = finiteValues(values);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function precomputedStat(
  detail: ThemeDetailV0 | null | undefined,
  rowKey: ConstituentStatRowKey,
  metric: string,
): number | null {
  const bucket = detail?.constituent_table_stats?.[rowKey];
  if (typeof bucket !== "object" || bucket == null) return null;
  const v = bucket[metric];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type ConstituentStatRowKey = "average" | "std_dev" | "positive_tickers_pct" | "median" | "min" | "max";

const PRICE_RETURN_STAT_FN: Record<
  ConstituentStatRowKey,
  (values: Array<number | null | undefined>) => number | null
> = {
  average,
  std_dev: stdDev,
  positive_tickers_pct: positivePercent,
  median,
  min: minValue,
  max: maxValue,
};

export function priceReturnStat(
  detail: ThemeDetailV0 | null | undefined,
  rowKey: ConstituentStatRowKey,
  column: ConstituentPriceReturnColumn,
  values: Array<number | null | undefined>,
  options?: { livePrices?: boolean },
): number | null {
  if (options?.livePrices) {
    return PRICE_RETURN_STAT_FN[rowKey](values);
  }
  return precomputedStat(detail, rowKey, column) ?? PRICE_RETURN_STAT_FN[rowKey](values);
}

export type ConstituentTableRow = {
  constituent: ThemeDetailConstituentV0;
  earnings: QuarterEarningsRow;
  priceReturns: Record<ConstituentPriceReturnColumn, number | null>;
  marketCapUsd: number | null | undefined;
  weight: number | null;
};

export type ThemeConstituentTableModel = {
  hasWeight: boolean;
  hasMcap: boolean;
  hasPriceReturns: boolean;
  priceReturnColumns: string[];
  constituentRows: ConstituentTableRow[];
  avgEarningsPerf: number | null;
  avgLastQuarterEarningsMove: number | null;
  avgAvgAbsRpt: number | null;
  avgIntraQtr: number | null;
  avgSinceQtrRpt: number | null;
  avgMarketCap: number | null;
  avgWeight: number | null;
  stdEarningsPerf: number | null;
  stdLastQuarterEarningsMove: number | null;
  stdAvgAbsRpt: number | null;
  stdIntraQtr: number | null;
  stdSinceQtrRpt: number | null;
  stdMarketCap: number | null;
  stdWeight: number | null;
  posEarningsPerf: number | null;
  posLastQuarterEarningsMove: number | null;
  posIntraQtr: number | null;
  posSinceQtrRpt: number | null;
  medianEarningsPerf: number | null;
  medianLastQuarterEarningsMove: number | null;
  medianAvgAbsRpt: number | null;
  medianIntraQtr: number | null;
  medianSinceQtrRpt: number | null;
  medianMarketCap: number | null;
  medianWeight: number | null;
  minEarningsPerf: number | null;
  minLastQuarterEarningsMove: number | null;
  minAvgAbsRpt: number | null;
  minIntraQtr: number | null;
  minSinceQtrRpt: number | null;
  minMarketCap: number | null;
  minWeight: number | null;
  maxEarningsPerf: number | null;
  maxLastQuarterEarningsMove: number | null;
  maxAvgAbsRpt: number | null;
  maxIntraQtr: number | null;
  maxSinceQtrRpt: number | null;
  maxMarketCap: number | null;
  maxWeight: number | null;
};

export function buildThemeConstituentTableModel(detail: ThemeDetailV0): ThemeConstituentTableModel {
  const hasWeight = Boolean(detail.constituents?.some((c) => c.weight != null));
  const hasMcap = Boolean(detail.constituents?.some((c) => inferMarketCapUsd(c) != null));
  const hasPriceReturns = hasConstituentPriceReturns(detail.constituents);
  const priceReturnColumns = resolveConstituentPriceReturnColumns(detail.constituents);
  const sortedConstituents = sortConstituentsByMarketCapDesc(detail.constituents);
  const earningsRowsByTicker = new Map(
    sortedConstituents.map((c) => [c.ticker, buildQuarterEarningsRow(c)]),
  );
  const constituentRows: ConstituentTableRow[] = [];
  for (const c of sortedConstituents) {
    const earnings = earningsRowsByTicker.get(c.ticker);
    if (!earnings) continue;
    const priceReturns = Object.fromEntries(
      priceReturnColumns.map((col) => [col, priceReturnMetric(c, col)]),
    ) as Record<ConstituentPriceReturnColumn, number | null>;
    constituentRows.push({
      constituent: c,
      earnings,
      priceReturns,
      marketCapUsd: inferMarketCapUsd(c) ?? null,
      weight: c.weight ?? null,
    });
  }

  return {
    hasWeight,
    hasMcap,
    hasPriceReturns,
    priceReturnColumns,
    constituentRows,
    avgEarningsPerf:
      precomputedStat(detail, "average", "earnings_move_pct") ??
      average(constituentRows.map((r) => r.earnings.earningsPerfValue)),
    avgLastQuarterEarningsMove:
      precomputedStat(detail, "average", "last_quarter_earnings_move_pct") ??
      average(constituentRows.map((r) => r.earnings.lastQuarterEarningsMoveValue)),
    avgAvgAbsRpt:
      precomputedStat(detail, "average", "avg_abs_rpt_pct") ??
      average(constituentRows.map((r) => r.earnings.avgAbsRptValue)),
    avgIntraQtr:
      precomputedStat(detail, "average", "intra_quarter_move_pct") ??
      average(constituentRows.map((r) => r.earnings.intraQtrValue)),
    avgSinceQtrRpt:
      precomputedStat(detail, "average", "since_last_report_pct") ??
      average(constituentRows.map((r) => r.earnings.sinceQtrRptValue)),
    avgMarketCap:
      precomputedStat(detail, "average", "market_cap_usd") ??
      average(constituentRows.map((r) => r.marketCapUsd)),
    avgWeight:
      precomputedStat(detail, "average", "weight") ?? average(constituentRows.map((r) => r.weight)),
    stdEarningsPerf:
      precomputedStat(detail, "std_dev", "earnings_move_pct") ??
      stdDev(constituentRows.map((r) => r.earnings.earningsPerfValue)),
    stdLastQuarterEarningsMove:
      precomputedStat(detail, "std_dev", "last_quarter_earnings_move_pct") ??
      stdDev(constituentRows.map((r) => r.earnings.lastQuarterEarningsMoveValue)),
    stdAvgAbsRpt:
      precomputedStat(detail, "std_dev", "avg_abs_rpt_pct") ??
      stdDev(constituentRows.map((r) => r.earnings.avgAbsRptValue)),
    stdIntraQtr:
      precomputedStat(detail, "std_dev", "intra_quarter_move_pct") ??
      stdDev(constituentRows.map((r) => r.earnings.intraQtrValue)),
    stdSinceQtrRpt:
      precomputedStat(detail, "std_dev", "since_last_report_pct") ??
      stdDev(constituentRows.map((r) => r.earnings.sinceQtrRptValue)),
    stdMarketCap:
      precomputedStat(detail, "std_dev", "market_cap_usd") ??
      stdDev(constituentRows.map((r) => r.marketCapUsd)),
    stdWeight:
      precomputedStat(detail, "std_dev", "weight") ?? stdDev(constituentRows.map((r) => r.weight)),
    posEarningsPerf:
      precomputedStat(detail, "positive_tickers_pct", "earnings_move_pct") ??
      positivePercent(constituentRows.map((r) => r.earnings.earningsPerfValue)),
    posLastQuarterEarningsMove:
      precomputedStat(detail, "positive_tickers_pct", "last_quarter_earnings_move_pct") ??
      positivePercent(constituentRows.map((r) => r.earnings.lastQuarterEarningsMoveValue)),
    posIntraQtr:
      precomputedStat(detail, "positive_tickers_pct", "intra_quarter_move_pct") ??
      positivePercent(constituentRows.map((r) => r.earnings.intraQtrValue)),
    posSinceQtrRpt:
      precomputedStat(detail, "positive_tickers_pct", "since_last_report_pct") ??
      positivePercent(constituentRows.map((r) => r.earnings.sinceQtrRptValue)),
    medianEarningsPerf:
      precomputedStat(detail, "median", "earnings_move_pct") ??
      median(constituentRows.map((r) => r.earnings.earningsPerfValue)),
    medianLastQuarterEarningsMove:
      precomputedStat(detail, "median", "last_quarter_earnings_move_pct") ??
      median(constituentRows.map((r) => r.earnings.lastQuarterEarningsMoveValue)),
    medianAvgAbsRpt:
      precomputedStat(detail, "median", "avg_abs_rpt_pct") ??
      median(constituentRows.map((r) => r.earnings.avgAbsRptValue)),
    medianIntraQtr:
      precomputedStat(detail, "median", "intra_quarter_move_pct") ??
      median(constituentRows.map((r) => r.earnings.intraQtrValue)),
    medianSinceQtrRpt:
      precomputedStat(detail, "median", "since_last_report_pct") ??
      median(constituentRows.map((r) => r.earnings.sinceQtrRptValue)),
    medianMarketCap:
      precomputedStat(detail, "median", "market_cap_usd") ??
      median(constituentRows.map((r) => r.marketCapUsd)),
    medianWeight:
      precomputedStat(detail, "median", "weight") ?? median(constituentRows.map((r) => r.weight)),
    minEarningsPerf:
      precomputedStat(detail, "min", "earnings_move_pct") ??
      minValue(constituentRows.map((r) => r.earnings.earningsPerfValue)),
    minLastQuarterEarningsMove:
      precomputedStat(detail, "min", "last_quarter_earnings_move_pct") ??
      minValue(constituentRows.map((r) => r.earnings.lastQuarterEarningsMoveValue)),
    minAvgAbsRpt:
      precomputedStat(detail, "min", "avg_abs_rpt_pct") ??
      minValue(constituentRows.map((r) => r.earnings.avgAbsRptValue)),
    minIntraQtr:
      precomputedStat(detail, "min", "intra_quarter_move_pct") ??
      minValue(constituentRows.map((r) => r.earnings.intraQtrValue)),
    minSinceQtrRpt:
      precomputedStat(detail, "min", "since_last_report_pct") ??
      minValue(constituentRows.map((r) => r.earnings.sinceQtrRptValue)),
    minMarketCap:
      precomputedStat(detail, "min", "market_cap_usd") ??
      minValue(constituentRows.map((r) => r.marketCapUsd)),
    minWeight:
      precomputedStat(detail, "min", "weight") ?? minValue(constituentRows.map((r) => r.weight)),
    maxEarningsPerf:
      precomputedStat(detail, "max", "earnings_move_pct") ??
      maxValue(constituentRows.map((r) => r.earnings.earningsPerfValue)),
    maxLastQuarterEarningsMove:
      precomputedStat(detail, "max", "last_quarter_earnings_move_pct") ??
      maxValue(constituentRows.map((r) => r.earnings.lastQuarterEarningsMoveValue)),
    maxAvgAbsRpt:
      precomputedStat(detail, "max", "avg_abs_rpt_pct") ??
      maxValue(constituentRows.map((r) => r.earnings.avgAbsRptValue)),
    maxIntraQtr:
      precomputedStat(detail, "max", "intra_quarter_move_pct") ??
      maxValue(constituentRows.map((r) => r.earnings.intraQtrValue)),
    maxSinceQtrRpt:
      precomputedStat(detail, "max", "since_last_report_pct") ??
      maxValue(constituentRows.map((r) => r.earnings.sinceQtrRptValue)),
    maxMarketCap:
      precomputedStat(detail, "max", "market_cap_usd") ??
      maxValue(constituentRows.map((r) => r.marketCapUsd)),
    maxWeight:
      precomputedStat(detail, "max", "weight") ?? maxValue(constituentRows.map((r) => r.weight)),
  };
}
