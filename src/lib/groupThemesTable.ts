import { normalizeCompareColumnOrder } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { GroupDetailChildThemeV0 } from "@/types/group.detail.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type GroupThemeTableRow = GroupDetailChildThemeV0 & {
  compare_returns?: ThemeCompareReturnsV0 | null;
};

const GROUP_RETURN_HEAD = ["Premarket", "Postmarket", "1D", "10D", "MTD", "YTD", "Period", "2Y", "5Y"] as const;
const GROUP_EARNINGS_TAIL = ["LstRpt %", "SinceLstRpt"] as const;
const GROUP_COMPARE_SKIP = new Set<string>([
  ...GROUP_RETURN_HEAD,
  ...GROUP_EARNINGS_TAIL,
  "1W",
]);

/** Column order for group child-theme metrics (calendar returns → custom dates → earnings). */
export function normalizeGroupThemesColumnOrder(cols: string[]): string[] {
  if (!cols.length) return [...GROUP_RETURN_HEAD, ...GROUP_EARNINGS_TAIL];
  const head: string[] = [];
  for (const k of GROUP_RETURN_HEAD) {
    if (cols.includes(k)) head.push(k);
  }
  const custom = cols.filter((c) => !GROUP_COMPARE_SKIP.has(c) && !head.includes(c));
  const tail = GROUP_EARNINGS_TAIL.filter((c) => cols.includes(c));
  return [...head, ...custom, ...tail];
}

export function resolveGroupThemesMetricColumns(rows: GroupThemeTableRow[]): string[] {
  const seen = new Set<string>();
  const raw: string[] = [];
  for (const row of rows) {
    const cols = row.compare_returns?.columns;
    if (cols?.length) {
      for (const c of cols) {
        const key = String(c || "").trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        raw.push(key);
      }
    }
    const m = row.compare_returns?.metrics;
    if (m) {
      for (const key of Object.keys(m)) {
        if (!key || seen.has(key)) continue;
        const v = m[key];
        if (typeof v === "number" && Number.isFinite(v)) {
          seen.add(key);
          raw.push(key);
        }
      }
    }
  }
  return normalizeGroupThemesColumnOrder(
    raw.length ? normalizeCompareColumnOrder(raw) : [...GROUP_RETURN_HEAD, ...GROUP_EARNINGS_TAIL],
  );
}

/** Prefer baked group JSON; fall back to compare bundle rows for returns. */
export function mergeGroupThemeTableRows(
  themes: GroupDetailChildThemeV0[],
  compareRows: CompareThemesRowV0[] | undefined,
): GroupThemeTableRow[] {
  const compareBySlug = new Map(
    (compareRows ?? [])
      .map((r) => [String(r.slug || "").trim(), r] as const)
      .filter(([slug]) => slug.length > 0),
  );
  return themes.map((t) => {
    const slug = String(t.slug || "").trim();
    const fromCompare = compareBySlug.get(slug);
    return {
      ...t,
      // Prefer live compare bundle over baked group JSON (full manifest embeds stale child metrics).
      compare_returns:
        fromCompare?.compare_returns ?? t.compare_returns ?? undefined,
      avg_market_cap_usd:
        t.avg_market_cap_usd ?? undefined,
      total_market_cap_usd:
        t.total_market_cap_usd ?? undefined,
    };
  });
}
