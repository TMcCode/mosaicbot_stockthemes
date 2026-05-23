import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdPlacement } from "@/components/AdPlacement";
import { DetailAboutIntro } from "@/components/DetailAboutIntro";
import { StockthemesDetailUnavailable } from "@/components/StockthemesDetailUnavailable";
import { Chart1yPanel } from "@/components/Chart1yPanel";
import { DeferRender } from "@/components/DeferRender";
import { TickerBadge } from "@/components/TickerBadge";
import { WatchlistStar } from "@/components/WatchlistStar";
import { ThemeChartLiveHydrate } from "@/components/ThemeChartLiveHydrate";
import { ThemeHeroTreemap } from "@/components/ThemeHeroTreemap";
import { ThemeDetailRuntimeLoader } from "@/components/ThemeDetailRuntimeLoader";
import { ThemeThesisBlock } from "@/components/ThemeThesisSection";
import { shouldShowThemeThesisUi } from "@/lib/themeThesis";
import styles from "../../page.module.css";

import { formatWeight } from "@/lib/formatWeight";
import {
  CONSTITUENT_PRICE_RETURN_COLUMNS,
  hasConstituentPriceReturns,
  priceReturnMetric,
  type ConstituentPriceReturnColumn,
} from "@/lib/constituentPriceReturns";
import {
  buildConstituentTreemapNodes,
  pickDefaultTreemapPeriod,
} from "@/lib/buildConstituentTreemapNodes";
import {
  buildCompositionMetaMap,
  formatUsdMarketCap,
  inferMarketCapUsd,
  sortConstituentsByMarketCapDesc,
} from "@/lib/constituentMeta";
import { trendingColumnHeader } from "@/lib/trendingCompareMetrics";
import { getManifestCached } from "@/lib/getManifestCached";
import { getSpyMarketPerfCached } from "@/lib/getSpyMarketPerf";
import { getThemeDetailCached } from "@/lib/getThemeDetailCached";
import { loadManifest } from "@/lib/loadManifest";
import { absoluteUrl, openGraphImageAsset } from "@/lib/seoMetadata";
import { publicAssetPath } from "@/lib/siteUrl";
import { detailEyebrowText } from "@/lib/stockthemesBuildHints";
import { formatTickerPerformanceAsOf } from "@/lib/formatSiteDataPublished";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render one HTML per theme for static hosting (GitHub Pages). */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { manifest } = await loadManifest();
  return manifest.themes.map((t) => ({ slug: t.slug }));
}

function clipDescription(s: string, max = 158): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

const ET_TIMEZONE = "America/New_York";
const ET_YMD_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: ET_TIMEZONE });
const ET_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, month: "numeric" });
const ET_DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIMEZONE,
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
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
const REPORT_PENDING_FALLBACK_DAY_BY_QUARTER: Record<number, string> = {
  1: "06/30",
  2: "09/30",
  3: "12/31",
  4: "03/31",
};

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
  const pick = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), hour: pick("hour"), minute: pick("minute") };
}

function quarterForMonth(month: number): 1 | 2 | 3 | 4 {
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

function fallbackDateWithYearForQuarter(
  quarter: 1 | 2 | 3 | 4,
  nowEtYear: number,
): string {
  const mmdd = REPORT_PENDING_FALLBACK_DAY_BY_QUARTER[quarter];
  const [mm, dd] = mmdd.split("/");
  const year = nowEtYear;
  return `${mm}/${dd}/${year}`;
}

function quarterEndDateEt(quarter: 1 | 2 | 3 | 4, year: number): Date {
  if (quarter === 1) return new Date(Date.UTC(year, 5, 30, 12, 0, 0)); // Jun 30
  if (quarter === 2) return new Date(Date.UTC(year, 8, 30, 12, 0, 0)); // Sep 30
  if (quarter === 3) return new Date(Date.UTC(year, 11, 31, 12, 0, 0)); // Dec 31
  return new Date(Date.UTC(year, 2, 31, 12, 0, 0)); // Mar 31
}

function isEffectiveReportedInEt(reportDate: Date, bamRaw: string | undefined, now: Date): boolean {
  const bam = String(bamRaw || "").toUpperCase();
  const reportYmdEt = ET_YMD_FORMATTER.format(reportDate);
  const nowYmdEt = ET_YMD_FORMATTER.format(now);
  if (reportYmdEt < nowYmdEt) return true;
  if (reportYmdEt > nowYmdEt) return false;
  const { hour, minute } = etNowParts(now);
  const etMinutes = hour * 60 + minute;
  const marketOpenMinutes = 9 * 60 + 30;
  const marketCloseMinutes = 16 * 60;
  if (bam === "BMO" || bam === "BEFOREMARKET") return etMinutes >= marketOpenMinutes;
  if (bam === "AMC" || bam === "AFTERMARKET") return etMinutes > marketCloseMinutes;
  return etMinutes >= marketOpenMinutes;
}

function formatPct(value: number | undefined | null): string {
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
  const label = ET_DISPLAY_DATE_FORMATTER.format(reportDate);
  const bam = String(bamRaw || "").toUpperCase();
  const bamLabel = bam === "AFTERMARKET" ? "AMC" : bam === "BEFOREMARKET" ? "BMO" : bam;
  const bamPart = bamLabel ? ` (${bamLabel}${isBmoTodayPartial ? "*" : ""})` : "";
  return `${label}${bamPart}`;
}

type QuarterEarningsRow = {
  lastReportDateCell: string;
  reportDateCell: string;
  lastQuarterEarningsMoveCell: string;
  earningsPerfCell: string;
  intraQtrCell: string;
  sinceQtrRptCell: string;
  earningsPerfIsProvisional: boolean;
  lastQuarterEarningsMoveValue: number | null;
  earningsPerfValue: number | null;
  intraQtrValue: number | null;
  sinceQtrRptValue: number | null;
};

function finiteOrNull(value: number | undefined | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

function buildQuarterEarningsRow(
  constituent: {
    last_report_date?: string;
    next_report_date?: string;
    last_before_after_market?: string;
    next_before_after_market?: string;
    last_rpt_percent?: number;
    last_rpt_live_percent?: number;
    last_rpt_final_percent?: number;
    last_rpt_is_final?: boolean;
    since_last_rpt_percent?: number;
    pre_earnings_percent_last_report?: number;
    earnings_percent_last_report?: number;
    earnings_percent_prev_report?: number;
  },
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
  const lastInQuarter = lastReport ? quarterForMonth(Number(ET_MONTH_FORMATTER.format(lastReport))) === currentQuarter : false;
  const nextInQuarter = nextReport ? quarterForMonth(Number(ET_MONTH_FORMATTER.format(nextReport))) === currentQuarter : false;
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
  return {
    lastReportDateCell,
    reportDateCell,
    lastQuarterEarningsMoveCell: formatPct(lastQuarterEarningsMoveValue),
    earningsPerfCell: hasReported ? formatPct(earningsPerfValue) : "—",
    intraQtrCell: formatPct(intraQtrValue),
    sinceQtrRptCell: hasReported ? formatPct(sinceQtrRptValue) : "—",
    earningsPerfIsProvisional: hasReported && earningsPerfIsProvisional,
    lastQuarterEarningsMoveValue,
    earningsPerfValue: hasReported ? earningsPerfValue : null,
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
  detail: { constituent_table_stats?: Record<string, Record<string, number | null> | string | undefined> } | null | undefined,
  rowKey: "average" | "std_dev" | "positive_tickers_pct" | "median" | "min" | "max",
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

function priceReturnStat(
  detail: { constituent_table_stats?: Record<string, Record<string, number | null> | string | undefined> } | null | undefined,
  rowKey: ConstituentStatRowKey,
  column: ConstituentPriceReturnColumn,
  values: Array<number | null | undefined>,
): number | null {
  return precomputedStat(detail, rowKey, column) ?? PRICE_RETURN_STAT_FN[rowKey](values);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { manifest } = await getManifestCached();
  const t = manifest.themes.find((x) => x.slug === slug);
  if (!t) {
    return { title: "Theme not found" };
  }
  const loaded = await getThemeDetailCached(slug);
  const desc =
    loaded?.detail.seo_intro != null && loaded.detail.seo_intro.trim() !== ""
      ? clipDescription(loaded.detail.seo_intro)
      : `Stocks and exposure for ${t.name} — stockthemes.ai`;
  const ogImage = openGraphImageAsset();
  return {
    title: t.name,
    description: desc,
    alternates: {
      canonical: absoluteUrl(`/themes/${slug}`),
    },
    openGraph: {
      title: t.name,
      description: desc,
      url: absoluteUrl(`/themes/${slug}`),
      siteName: "stockthemes.ai",
      type: "article",
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t.name,
      description: desc,
      images: [ogImage.url],
    },
  };
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const { manifest, source } = await getManifestCached();
  const theme = manifest.themes.find((x) => x.slug === slug);
  if (!theme) {
    notFound();
  }

  const group = theme.group_slug
    ? manifest.groups.find((g) => g.slug === theme.group_slug)
    : undefined;

  const loaded = await getThemeDetailCached(slug);
  const detail = loaded?.detail;
  const dataBaseUrl = stockthemesPublicDataBase() ?? null;
  const compositionMetaByTicker = buildCompositionMetaMap(detail?.constituents);
  const treemapNodes = buildConstituentTreemapNodes(detail?.constituents);
  const spyPerf = await getSpyMarketPerfCached();
  const totalMarketCapUsd =
    detail?.constituents?.reduce((sum, c) => sum + (inferMarketCapUsd(c) ?? 0), 0) ?? 0;
  const hasTotalMarketCap = totalMarketCapUsd > 0;

  const hasWeight = Boolean(detail?.constituents?.some((c) => c.weight != null));
  const hasMcap = Boolean(detail?.constituents?.some((c) => inferMarketCapUsd(c) != null));
  const hasPriceReturns = hasConstituentPriceReturns(detail?.constituents);
  const sortedConstituents = detail?.constituents ? sortConstituentsByMarketCapDesc(detail.constituents) : [];
  const earningsRowsByTicker = new Map(
    sortedConstituents.map((c) => [c.ticker, buildQuarterEarningsRow(c)]),
  );
  const constituentRows = sortedConstituents
    .map((c) => {
      const earnings = earningsRowsByTicker.get(c.ticker);
      if (!earnings) return null;
      const priceReturns = Object.fromEntries(
        CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => [col, priceReturnMetric(c, col)]),
      ) as Record<ConstituentPriceReturnColumn, number | null>;
      return {
        constituent: c,
        earnings,
        priceReturns,
        marketCapUsd: inferMarketCapUsd(c),
        weight: c.weight ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const avgEarningsPerf =
    precomputedStat(detail, "average", "earnings_move_pct") ??
    average(constituentRows.map((row) => row.earnings.earningsPerfValue));
  const avgLastQuarterEarningsMove =
    precomputedStat(detail, "average", "last_quarter_earnings_move_pct") ??
    average(constituentRows.map((row) => row.earnings.lastQuarterEarningsMoveValue));
  const avgIntraQtr =
    precomputedStat(detail, "average", "intra_quarter_move_pct") ??
    average(constituentRows.map((row) => row.earnings.intraQtrValue));
  const avgSinceQtrRpt =
    precomputedStat(detail, "average", "since_last_report_pct") ??
    average(constituentRows.map((row) => row.earnings.sinceQtrRptValue));
  const avgMarketCap =
    precomputedStat(detail, "average", "market_cap_usd") ??
    average(constituentRows.map((row) => row.marketCapUsd));
  const avgWeight =
    precomputedStat(detail, "average", "weight") ??
    average(constituentRows.map((row) => row.weight));

  const stdEarningsPerf =
    precomputedStat(detail, "std_dev", "earnings_move_pct") ??
    stdDev(constituentRows.map((row) => row.earnings.earningsPerfValue));
  const stdLastQuarterEarningsMove =
    precomputedStat(detail, "std_dev", "last_quarter_earnings_move_pct") ??
    stdDev(constituentRows.map((row) => row.earnings.lastQuarterEarningsMoveValue));
  const stdIntraQtr =
    precomputedStat(detail, "std_dev", "intra_quarter_move_pct") ??
    stdDev(constituentRows.map((row) => row.earnings.intraQtrValue));
  const stdSinceQtrRpt =
    precomputedStat(detail, "std_dev", "since_last_report_pct") ??
    stdDev(constituentRows.map((row) => row.earnings.sinceQtrRptValue));
  const stdMarketCap =
    precomputedStat(detail, "std_dev", "market_cap_usd") ??
    stdDev(constituentRows.map((row) => row.marketCapUsd));
  const stdWeight =
    precomputedStat(detail, "std_dev", "weight") ??
    stdDev(constituentRows.map((row) => row.weight));

  const posEarningsPerf =
    precomputedStat(detail, "positive_tickers_pct", "earnings_move_pct") ??
    positivePercent(constituentRows.map((row) => row.earnings.earningsPerfValue));
  const posLastQuarterEarningsMove =
    precomputedStat(detail, "positive_tickers_pct", "last_quarter_earnings_move_pct") ??
    positivePercent(constituentRows.map((row) => row.earnings.lastQuarterEarningsMoveValue));
  const posIntraQtr =
    precomputedStat(detail, "positive_tickers_pct", "intra_quarter_move_pct") ??
    positivePercent(constituentRows.map((row) => row.earnings.intraQtrValue));
  const posSinceQtrRpt =
    precomputedStat(detail, "positive_tickers_pct", "since_last_report_pct") ??
    positivePercent(constituentRows.map((row) => row.earnings.sinceQtrRptValue));

  const medianEarningsPerf =
    precomputedStat(detail, "median", "earnings_move_pct") ??
    median(constituentRows.map((row) => row.earnings.earningsPerfValue));
  const medianLastQuarterEarningsMove =
    precomputedStat(detail, "median", "last_quarter_earnings_move_pct") ??
    median(constituentRows.map((row) => row.earnings.lastQuarterEarningsMoveValue));
  const medianIntraQtr =
    precomputedStat(detail, "median", "intra_quarter_move_pct") ??
    median(constituentRows.map((row) => row.earnings.intraQtrValue));
  const medianSinceQtrRpt =
    precomputedStat(detail, "median", "since_last_report_pct") ??
    median(constituentRows.map((row) => row.earnings.sinceQtrRptValue));
  const medianMarketCap =
    precomputedStat(detail, "median", "market_cap_usd") ??
    median(constituentRows.map((row) => row.marketCapUsd));
  const medianWeight =
    precomputedStat(detail, "median", "weight") ??
    median(constituentRows.map((row) => row.weight));

  const minEarningsPerf =
    precomputedStat(detail, "min", "earnings_move_pct") ??
    minValue(constituentRows.map((row) => row.earnings.earningsPerfValue));
  const minLastQuarterEarningsMove =
    precomputedStat(detail, "min", "last_quarter_earnings_move_pct") ??
    minValue(constituentRows.map((row) => row.earnings.lastQuarterEarningsMoveValue));
  const minIntraQtr =
    precomputedStat(detail, "min", "intra_quarter_move_pct") ??
    minValue(constituentRows.map((row) => row.earnings.intraQtrValue));
  const minSinceQtrRpt =
    precomputedStat(detail, "min", "since_last_report_pct") ??
    minValue(constituentRows.map((row) => row.earnings.sinceQtrRptValue));
  const minMarketCap =
    precomputedStat(detail, "min", "market_cap_usd") ??
    minValue(constituentRows.map((row) => row.marketCapUsd));
  const minWeight =
    precomputedStat(detail, "min", "weight") ??
    minValue(constituentRows.map((row) => row.weight));

  const maxEarningsPerf =
    precomputedStat(detail, "max", "earnings_move_pct") ??
    maxValue(constituentRows.map((row) => row.earnings.earningsPerfValue));
  const maxLastQuarterEarningsMove =
    precomputedStat(detail, "max", "last_quarter_earnings_move_pct") ??
    maxValue(constituentRows.map((row) => row.earnings.lastQuarterEarningsMoveValue));
  const maxIntraQtr =
    precomputedStat(detail, "max", "intra_quarter_move_pct") ??
    maxValue(constituentRows.map((row) => row.earnings.intraQtrValue));
  const maxSinceQtrRpt =
    precomputedStat(detail, "max", "since_last_report_pct") ??
    maxValue(constituentRows.map((row) => row.earnings.sinceQtrRptValue));
  const maxMarketCap =
    precomputedStat(detail, "max", "market_cap_usd") ??
    maxValue(constituentRows.map((row) => row.marketCapUsd));
  const maxWeight =
    precomputedStat(detail, "max", "weight") ??
    maxValue(constituentRows.map((row) => row.weight));
  const themeUrl = absoluteUrl(`/themes/${slug}`);
  const dateModified = detail?.updated_at || detail?.as_of || manifest.as_of;
  const pageDescription = detail?.seo_intro?.trim() || `Stocks and exposure for ${theme.name}.`;
  const mentions = (detail?.constituents || []).slice(0, 25).map((c) => ({
    "@type": "Thing",
    name: c.name ? `${c.name} (${c.ticker})` : c.ticker,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
      "@type": "WebPage",
      name: `${theme.name} theme`,
      description: pageDescription,
      url: themeUrl,
      dateModified,
      isPartOf: {
        "@type": "WebSite",
        name: "stockthemes.ai",
        url: absoluteUrl("/"),
      },
      about: [
        { "@type": "Thing", name: theme.name },
        ...(group?.name ? [{ "@type": "Thing", name: group.name }] : []),
      ],
      },
      {
      "@type": "DefinedTermSet",
      name: theme.name,
      description: pageDescription,
      url: themeUrl,
      dateModified,
      isPartOf: absoluteUrl("/themes"),
      keywords: [theme.name, group?.name, "stocks", "theme investing", "equity exposure"]
        .filter(Boolean)
        .join(", "),
      hasDefinedTerm: mentions,
      },
    ],
  };

  return (
    <div className={`st-surface ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={`${styles.heroGrid} ${treemapNodes.length ? styles.heroGridThemeDetail : ""}`}>
            <div className={styles.heroMain}>
              <p className={styles.eyebrow}>
                {detailEyebrowText("Theme", source, loaded?.source ?? null)}
              </p>
              <h1 style={{ margin: 0 }}>{theme.name}</h1>
              <div className={styles.themeWatchlistAction}>
                <WatchlistStar
                  prominent
                  itemType="theme"
                  itemKey={slug}
                  label={theme.name}
                  signInNext={`/themes/${slug}`}
                />
              </div>
              {theme.ticker_count != null || hasTotalMarketCap ? (
                <p>
                  {theme.ticker_count != null ? `${theme.ticker_count} tickers` : null}
                  {theme.ticker_count != null && hasTotalMarketCap ? " · " : null}
                  {hasTotalMarketCap ? `${formatUsdMarketCap(totalMarketCapUsd)} total market cap` : null}
                </p>
              ) : null}
              {theme.group_slug ? (
                <p>
                  Group:{" "}
                  <Link href={`/groups/${theme.group_slug}`} style={{ fontWeight: 600 }}>
                    {group?.name ?? "Group"}
                  </Link>
                </p>
              ) : null}
              {shouldShowThemeThesisUi(detail?.theme_thesis) ? (
                <ThemeThesisBlock
                  themeThesis={detail?.theme_thesis}
                  signInNext={`/themes/${slug}`}
                />
              ) : null}
              {!detail && !dataBaseUrl ? (
                <StockthemesDetailUnavailable kind="theme" slug={slug} />
              ) : null}
              <AdPlacement
                placement="themeRail"
                className={`${styles.adSlot} ${styles.groupsAdCompact} ${styles.heroMainAd}`}
                classNameWhenActive={`${styles.adSlot} ${styles.groupsAdCompact} ${styles.heroMainAd}`}
                placeholderLabel="Ad Slot · Theme detail"
                format="horizontal"
              />
            </div>
            <div className={styles.themeHeroRail}>
              {treemapNodes.length ? (
                <ThemeHeroTreemap
                  nodes={treemapNodes}
                  themeName={theme.name}
                  defaultReturnPeriod={pickDefaultTreemapPeriod(treemapNodes)}
                  asOfLabel={
                    detail?.ticker_performance_as_of
                      ? formatTickerPerformanceAsOf(detail.ticker_performance_as_of)
                      : undefined
                  }
                />
              ) : null}
            </div>
          </div>
          {!detail && dataBaseUrl ? (
            <ThemeDetailRuntimeLoader
              slug={slug}
              dataBaseUrl={dataBaseUrl}
              benchmarkPerformance={spyPerf?.benchmarkPerformance}
            />
          ) : null}
          {detail && dataBaseUrl ? (
            <DeferRender minHeight={460} rootMargin="360px 0px">
              <div className={styles.tightChartTop}>
                <ThemeChartLiveHydrate
                  key={slug}
                  slug={slug}
                  dataBaseUrl={dataBaseUrl}
                  serverChart={detail.chart_1y}
                  compositionMetaByTicker={compositionMetaByTicker}
                  performanceTitle={theme.name}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                />
              </div>
            </DeferRender>
          ) : null}
          {detail && !dataBaseUrl ? (
            <DeferRender minHeight={460} rootMargin="360px 0px">
              <div className={styles.tightChartTop}>
                <Chart1yPanel
                  chart1y={detail.chart_1y}
                  compositionMetaByTicker={compositionMetaByTicker}
                  performanceTitle={theme.name}
                  benchmarkPerformance={spyPerf?.benchmarkPerformance}
                />
              </div>
            </DeferRender>
          ) : null}
          {detail ? (
            <AdPlacement
              placement="themeChartEnd"
              className={`${styles.adSlot} ${styles.adChartEnd}`}
              classNameWhenActive={`${styles.adSlot} ${styles.adChartEnd}`}
              placeholderLabel="Ad Slot · Below chart"
              format="horizontal"
            />
          ) : null}
          {detail?.constituents?.length ? (
            <section className={styles.section} aria-labelledby="constituents-heading">
              <h2 id="constituents-heading">Constituents</h2>
              {detail.build_id ? (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 0 }}>
                  Build <code className={styles.code}>{detail.build_id}</code>
                </p>
              ) : null}
              <div className={styles.tableWrap}>
                <div className={styles.tableWatermark} aria-hidden="true">
                  <img
                    src={publicAssetPath("/brand/logo-full-transparent.png")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th scope="col">Company</th>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <th key={col} scope="col">
                              {trendingColumnHeader(col)}
                            </th>
                          ))
                        : null}
                      <th scope="col">Previous Quarter Report Date</th>
                      <th scope="col">Next Expected Report Date</th>
                      <th scope="col">Last Quarter Earnings Move %</th>
                      <th scope="col">Earnings Move %</th>
                      <th scope="col">Intra-Quarter Move %</th>
                      <th scope="col">Since Last Report %</th>
                      {hasMcap ? <th scope="col">Market cap</th> : null}
                      {hasWeight ? <th scope="col">Weight</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {constituentRows.map((row) => {
                      const c = row.constituent;
                      const earnings = row.earnings;
                      return (
                      <tr key={c.ticker}>
                        <td>
                          <div className={styles.companyCell}>
                            <span className={styles.companyName}>{c.name?.trim() || "—"}</span>
                            <TickerBadge ticker={c.ticker} />
                          </div>
                        </td>
                        {hasPriceReturns
                          ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                              <td key={col}>{formatPct(row.priceReturns[col])}</td>
                            ))
                          : null}
                        <td>{earnings.lastReportDateCell}</td>
                        <td>{earnings.reportDateCell}</td>
                        <td>{earnings.lastQuarterEarningsMoveCell}</td>
                        <td>{earnings.earningsPerfCell}{earnings.earningsPerfIsProvisional ? "*" : ""}</td>
                        <td>{earnings.intraQtrCell}</td>
                        <td>{earnings.sinceQtrRptCell}</td>
                        {hasMcap ? <td>{formatUsdMarketCap(row.marketCapUsd)}</td> : null}
                        {hasWeight ? (
                          <td>{c.weight != null ? formatWeight(c.weight) : "—"}</td>
                        ) : null}
                      </tr>
                    )})}
                    <tr>
                      <td>
                        <strong>Average</strong>
                      </td>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>
                              <strong>
                                {formatPct(
                                  priceReturnStat(
                                    detail,
                                    "average",
                                    col,
                                    constituentRows.map((r) => r.priceReturns[col]),
                                  ),
                                )}
                              </strong>
                            </td>
                          ))
                        : null}
                      <td></td>
                      <td></td>
                      <td><strong>{formatPct(avgLastQuarterEarningsMove)}</strong></td>
                      <td><strong>{formatPct(avgEarningsPerf)}</strong></td>
                      <td><strong>{formatPct(avgIntraQtr)}</strong></td>
                      <td><strong>{formatPct(avgSinceQtrRpt)}</strong></td>
                      {hasMcap ? <td><strong>{formatUsdMarketCap(avgMarketCap)}</strong></td> : null}
                      {hasWeight ? <td><strong>{avgWeight != null ? formatWeight(avgWeight) : "—"}</strong></td> : null}
                    </tr>
                    <tr>
                      <td>
                        <strong>Median</strong>
                      </td>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>
                              <strong>
                                {formatPct(
                                  priceReturnStat(
                                    detail,
                                    "median",
                                    col,
                                    constituentRows.map((r) => r.priceReturns[col]),
                                  ),
                                )}
                              </strong>
                            </td>
                          ))
                        : null}
                      <td></td>
                      <td></td>
                      <td><strong>{formatPct(medianLastQuarterEarningsMove)}</strong></td>
                      <td><strong>{formatPct(medianEarningsPerf)}</strong></td>
                      <td><strong>{formatPct(medianIntraQtr)}</strong></td>
                      <td><strong>{formatPct(medianSinceQtrRpt)}</strong></td>
                      {hasMcap ? <td><strong>{formatUsdMarketCap(medianMarketCap)}</strong></td> : null}
                      {hasWeight ? <td><strong>{medianWeight != null ? formatWeight(medianWeight) : "—"}</strong></td> : null}
                    </tr>
                    <tr>
                      <td>
                        <strong>Std Dev</strong>
                      </td>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>
                              <strong>
                                {formatPct(
                                  priceReturnStat(
                                    detail,
                                    "std_dev",
                                    col,
                                    constituentRows.map((r) => r.priceReturns[col]),
                                  ),
                                )}
                              </strong>
                            </td>
                          ))
                        : null}
                      <td></td>
                      <td></td>
                      <td><strong>{formatPct(stdLastQuarterEarningsMove)}</strong></td>
                      <td><strong>{formatPct(stdEarningsPerf)}</strong></td>
                      <td><strong>{formatPct(stdIntraQtr)}</strong></td>
                      <td><strong>{formatPct(stdSinceQtrRpt)}</strong></td>
                      {hasMcap ? <td><strong>{formatUsdMarketCap(stdMarketCap)}</strong></td> : null}
                      {hasWeight ? <td><strong>{stdWeight != null ? formatWeight(stdWeight) : "—"}</strong></td> : null}
                    </tr>
                    <tr>
                      <td>
                        <strong>Min</strong>
                      </td>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>
                              <strong>
                                {formatPct(
                                  priceReturnStat(
                                    detail,
                                    "min",
                                    col,
                                    constituentRows.map((r) => r.priceReturns[col]),
                                  ),
                                )}
                              </strong>
                            </td>
                          ))
                        : null}
                      <td></td>
                      <td></td>
                      <td><strong>{formatPct(minLastQuarterEarningsMove)}</strong></td>
                      <td><strong>{formatPct(minEarningsPerf)}</strong></td>
                      <td><strong>{formatPct(minIntraQtr)}</strong></td>
                      <td><strong>{formatPct(minSinceQtrRpt)}</strong></td>
                      {hasMcap ? <td><strong>{formatUsdMarketCap(minMarketCap)}</strong></td> : null}
                      {hasWeight ? <td><strong>{minWeight != null ? formatWeight(minWeight) : "—"}</strong></td> : null}
                    </tr>
                    <tr>
                      <td>
                        <strong>Max</strong>
                      </td>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>
                              <strong>
                                {formatPct(
                                  priceReturnStat(
                                    detail,
                                    "max",
                                    col,
                                    constituentRows.map((r) => r.priceReturns[col]),
                                  ),
                                )}
                              </strong>
                            </td>
                          ))
                        : null}
                      <td></td>
                      <td></td>
                      <td><strong>{formatPct(maxLastQuarterEarningsMove)}</strong></td>
                      <td><strong>{formatPct(maxEarningsPerf)}</strong></td>
                      <td><strong>{formatPct(maxIntraQtr)}</strong></td>
                      <td><strong>{formatPct(maxSinceQtrRpt)}</strong></td>
                      {hasMcap ? <td><strong>{formatUsdMarketCap(maxMarketCap)}</strong></td> : null}
                      {hasWeight ? <td><strong>{maxWeight != null ? formatWeight(maxWeight) : "—"}</strong></td> : null}
                    </tr>
                    <tr>
                      <td>
                        <strong>% Positive Tickers</strong>
                      </td>
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>
                              <strong>
                                {formatPct(
                                  priceReturnStat(
                                    detail,
                                    "positive_tickers_pct",
                                    col,
                                    constituentRows.map((r) => r.priceReturns[col]),
                                  ),
                                )}
                              </strong>
                            </td>
                          ))
                        : null}
                      <td></td>
                      <td></td>
                      <td><strong>{formatPct(posLastQuarterEarningsMove)}</strong></td>
                      <td><strong>{formatPct(posEarningsPerf)}</strong></td>
                      <td><strong>{formatPct(posIntraQtr)}</strong></td>
                      <td><strong>{formatPct(posSinceQtrRpt)}</strong></td>
                      {hasMcap ? <td></td> : null}
                      {hasWeight ? <td></td> : null}
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
                  * Provisional value: before LstRpt% reaches its 2-day post-report lock window (BMO/AMC adjusted),
                  EarningsPerf is calculated from current vs pre-report and then locks to final LstRpt%.
                </p>
              </div>
            </section>
          ) : null}
          {detail && !detail.constituents.length ? (
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No constituents in this payload.</p>
          ) : null}
          <DetailAboutIntro
            heading="About this theme"
            headingId="about-theme-heading"
            intro={detail?.seo_intro}
          />
          <p>
            <Link href="/themes" style={{ fontWeight: 500 }}>
              ← All themes
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
