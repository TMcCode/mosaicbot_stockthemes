import type { ConstituentEarningsColumnId } from "@/lib/constituentEarningsColumnHelp";
import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { ConstituentTableRow } from "@/lib/themeConstituentTableModel";
import { weightedMeanRenormalized } from "@/lib/weightedMeanRenormalized";
import type { ThemeCompareReturnsV0, ThemeDetailV0 } from "@/types/theme.detail.v0";

/** Map earnings columns → ``constituent_table_stats.theme_return`` metric keys. */
export const THEME_EARNINGS_WEIGHT_METRIC: Partial<
  Record<ConstituentEarningsColumnId, string>
> = {
  last_quarter_earnings_move: "last_quarter_earnings_move_pct",
  earnings_move: "earnings_move_pct",
  intra_quarter_move: "intra_quarter_move_pct",
  since_last_report: "since_last_report_pct",
  avg_abs_rpt: "avg_abs_rpt_pct",
};

function finiteThemeReturnStat(
  detail: ThemeDetailV0 | null | undefined,
  metric: string,
): number | null {
  const bucket = detail?.constituent_table_stats?.theme_return;
  if (typeof bucket !== "object" || bucket == null) return null;
  const v = bucket[metric];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function earningsValueForColumn(
  row: ConstituentTableRow,
  columnId: ConstituentEarningsColumnId,
): number | null {
  switch (columnId) {
    case "last_quarter_earnings_move":
      return row.earnings.lastQuarterEarningsMoveValue;
    case "earnings_move":
      return row.earnings.earningsPerfValue;
    case "intra_quarter_move":
      return row.earnings.intraQtrValue;
    case "since_last_report":
      return row.earnings.sinceQtrRptValue;
    case "avg_abs_rpt":
      return row.earnings.avgAbsRptValue;
    default:
      return null;
  }
}

/** Manual ThemeWgt mean for an earnings column (ETL theme_return, else client fallback). */
export function themeEarningsWeightReturnPct(
  detail: ThemeDetailV0 | null | undefined,
  columnId: ConstituentEarningsColumnId,
  rows: ConstituentTableRow[],
): number | null {
  const metric = THEME_EARNINGS_WEIGHT_METRIC[columnId];
  if (!metric) return null;
  const fromEtl = finiteThemeReturnStat(detail, metric);
  if (fromEtl != null) return fromEtl;
  return weightedMeanRenormalized(
    rows.map((r) => ({ weight: r.weight, value: earningsValueForColumn(r, columnId) })),
  );
}

export function themeManualWeightReturnPct(
  columnKey: string,
  compare: ThemeCompareReturnsV0 | undefined,
  themeName: string,
): number | null {
  const v = valueForTrendingColumn(columnKey, compare, {}, themeName);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function hasThemeManualWeightReturns(
  compare: ThemeCompareReturnsV0 | undefined,
  periodColumns: string[],
  view: "returns" | "earnings",
  options?: {
    detail?: ThemeDetailV0 | null;
    constituentRows?: ConstituentTableRow[];
  },
): boolean {
  if (view === "returns") {
    const m = compare?.metrics;
    if (!m || typeof m !== "object") return false;
    return periodColumns.some((col) => {
      const v = m[col];
      return typeof v === "number" && Number.isFinite(v);
    });
  }
  const detail = options?.detail;
  const rows = options?.constituentRows ?? [];
  return (Object.keys(THEME_EARNINGS_WEIGHT_METRIC) as ConstituentEarningsColumnId[]).some(
    (colId) => themeEarningsWeightReturnPct(detail, colId, rows) != null,
  );
}
