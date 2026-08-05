import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export const COMPARE_SUMMARY_PERIODS = [
  { key: "1D", label: "1D" },
  { key: "10D", label: "10D" },
  { key: "1M", label: "1M" },
  { key: "MTD", label: "MTD" },
  { key: "YTD", label: "YTD" },
] as const;

export type CompareSummaryPeriod = (typeof COMPARE_SUMMARY_PERIODS)[number]["key"];

const FLAT_EPS = 0.5;
const MIN_THEMES_PER_GROUP = 2;

export type CompareThemeExtreme = {
  slug: string;
  name: string;
  value: number;
};

export type CompareGroupExtreme = {
  name: string;
  slug: string;
  median: number;
  themeCount: number;
};

export type ComparePeriodSummary = {
  period: CompareSummaryPeriod;
  filteredCount: number;
  withDataCount: number;
  median: number | null;
  up: number;
  down: number;
  flat: number;
  positivePct: number | null;
  best: CompareThemeExtreme | null;
  worst: CompareThemeExtreme | null;
  topGroup: CompareGroupExtreme | null;
  bottomGroup: CompareGroupExtreme | null;
};

type SummaryRow = {
  slug: string;
  name: string;
  groupSlug?: string | null;
  groupName?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function groupMedians(rows: SummaryRow[], period: CompareSummaryPeriod): CompareGroupExtreme[] {
  const byGroup = new Map<string, { values: number[]; slug: string }>();
  for (const row of rows) {
    const group = String(row.groupName || "").trim() || "Other";
    const v = valueForTrendingColumn(period, row.compareReturns ?? undefined, {}, row.name);
    if (v == null || !Number.isFinite(v)) continue;
    let bucket = byGroup.get(group);
    if (!bucket) {
      bucket = { values: [], slug: String(row.groupSlug || "").trim() };
      byGroup.set(group, bucket);
    }
    if (!bucket.slug && row.groupSlug) {
      bucket.slug = String(row.groupSlug).trim();
    }
    bucket.values.push(v);
  }

  const out: CompareGroupExtreme[] = [];
  for (const [name, { values, slug }] of byGroup) {
    if (values.length < MIN_THEMES_PER_GROUP) continue;
    const m = median(values);
    if (m != null) out.push({ name, slug, median: m, themeCount: values.length });
  }
  return out.sort((a, b) => b.median - a.median);
}

export function computeComparePeriodSummary(
  rows: SummaryRow[],
  period: CompareSummaryPeriod,
): ComparePeriodSummary {
  const entries: { row: SummaryRow; value: number }[] = [];
  for (const row of rows) {
    const value = valueForTrendingColumn(period, row.compareReturns ?? undefined, {}, row.name);
    if (value != null && Number.isFinite(value)) entries.push({ row, value });
  }

  let up = 0;
  let down = 0;
  let flat = 0;
  let best: CompareThemeExtreme | null = null;
  let worst: CompareThemeExtreme | null = null;

  for (const { row, value } of entries) {
    if (value > FLAT_EPS) up += 1;
    else if (value < -FLAT_EPS) down += 1;
    else flat += 1;

    if (!best || value > best.value) {
      best = { slug: row.slug, name: row.name, value };
    }
    if (!worst || value < worst.value) {
      worst = { slug: row.slug, name: row.name, value };
    }
  }

  const values = entries.map((e) => e.value);
  const groups = groupMedians(rows, period);

  return {
    period,
    filteredCount: rows.length,
    withDataCount: entries.length,
    median: median(values),
    up,
    down,
    flat,
    positivePct: values.length ? (up / values.length) * 100 : null,
    best,
    worst,
    topGroup: groups[0] ?? null,
    bottomGroup: groups.length > 0 ? groups[groups.length - 1] : null,
  };
}

export function availableCompareSummaryPeriods(columns: string[]): CompareSummaryPeriod[] {
  return COMPARE_SUMMARY_PERIODS.filter((p) => columns.includes(p.key)).map((p) => p.key);
}
