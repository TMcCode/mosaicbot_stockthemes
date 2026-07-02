import type {
  ThemeRevenueConstituentV0,
  ThemeRevenueMetricMapV0,
  ThemeRevenueRevisionsV0,
  ThemeRevenueTableStatsBlockV0,
  ThemeRevenueV0,
} from "@/types/theme.revenue.v0";

export const REVENUE_SIDECAR_SUFFIX = ".revenue.v0.json";

export type RevenueDisplayMode = "growth" | "accel";

export type RevenueColumnDef = {
  id: string;
  label: string;
  growthKey?: keyof ThemeRevenueMetricMapV0;
  accelKey?: keyof ThemeRevenueMetricMapV0;
  revisionKey?: keyof ThemeRevenueRevisionsV0;
  growthOnly?: boolean;
  hideInAccel?: boolean;
  format: "pct" | "pp" | "ratio" | "bps" | "count";
};

export const REVENUE_GROWTH_COLUMNS: RevenueColumnDef[] = [
  { id: "lq", label: "LQ Rev\nAct", growthKey: "lq_rev_act_pct", growthOnly: true, format: "pct" },
  { id: "cq", label: "CQ Rev\nEst", growthKey: "cq_rev_est_pct", accelKey: "cq_accel_pp", format: "pct" },
  { id: "nq", label: "NQ Rev\nEst", growthKey: "nq_rev_est_pct", accelKey: "nq_accel_pp", format: "pct" },
  { id: "ly", label: "LY Rev\nAct", growthKey: "ly_rev_act_pct", accelKey: "ly_cy_accel_pp", format: "pct" },
  { id: "cy", label: "CY Rev\nEst", growthKey: "cy_rev_est_pct", accelKey: "cy_ny_accel_pp", format: "pct" },
  { id: "ny", label: "NY Rev\nEst", growthKey: "ny_rev_est_pct", accelKey: "ny_n2y_accel_pp", format: "pct" },
  { id: "n2y", label: "N2Y Rev\nEst", growthKey: "n2y_rev_est_pct", format: "pct", hideInAccel: true },
  { id: "trail3y", label: "3Yr\nCAGR", growthKey: "trail_3y_cagr_pct", format: "pct", hideInAccel: true },
  { id: "fwd3y", label: "3Y Fwd\nCAGR", growthKey: "fwd_3y_cagr_pct", format: "pct", hideInAccel: true },
  { id: "ps_ntm", label: "P/S\nNTM", growthKey: "ps_ratio_ntm", format: "ratio", hideInAccel: true },
  { id: "psg_ntm", label: "PSG\nNTM", growthKey: "ps_to_revgrowth", format: "ratio", hideInAccel: true },
  { id: "psg_ny", label: "PSG\nNY", growthKey: "psg_ny", format: "ratio", hideInAccel: true },
  { id: "psg_n2y", label: "PSG\nN2Y", growthKey: "psg_n2y", format: "ratio", hideInAccel: true },
];

export const REVENUE_REVISION_COLUMNS: RevenueColumnDef[] = [
  { id: "rev_latest", label: "Est Latest\n(%)", revisionKey: "growth_est_latest_pct", format: "pct" },
  { id: "rev_first", label: "Est First\n(%)", revisionKey: "growth_est_first_pct", format: "pct" },
  { id: "rev_delta", label: "Rev Δ\n(bps)", revisionKey: "growth_delta_bps", format: "bps" },
  { id: "rev_low", label: "Est Low\n(%)", revisionKey: "growth_est_low_pct", format: "pct" },
  { id: "rev_high", label: "Est High\n(%)", revisionKey: "growth_est_high_pct", format: "pct" },
  { id: "rev_analysts", label: "#\nAnalysts", revisionKey: "revenue_est_analysts", format: "count" },
];

export type RevenueStatRowKey =
  | "average"
  | "median"
  | "std_dev"
  | "min"
  | "max"
  | "positive_tickers_pct";

export const REVENUE_STAT_ROW_LABELS: Record<RevenueStatRowKey, string> = {
  average: "Average",
  median: "Median",
  std_dev: "Std Dev",
  min: "Min",
  max: "Max",
  positive_tickers_pct: "% Positive Tickers",
};

export function themeRevenueUrl(dataBaseUrl: string, slug: string): string {
  const base = dataBaseUrl.replace(/\/$/, "");
  return `${base}/themes/${encodeURIComponent(slug)}${REVENUE_SIDECAR_SUFFIX}`;
}

export function parseThemeRevenue(raw: string): ThemeRevenueV0 {
  const data = JSON.parse(raw) as ThemeRevenueV0;
  if (data.schema_version !== 0 || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme.revenue.v0 payload");
  }
  return data;
}

export function revenueHasContent(data: ThemeRevenueV0 | null | undefined): boolean {
  return Boolean(data?.constituents?.length);
}

export function formatRevenuePct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)}`;
}

export function formatRevenuePp(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}`;
}

export function formatRevenueRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function formatRevenueBps(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

export function formatRevenueCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

export function revenueColumnFieldKey(col: RevenueColumnDef, mode: RevenueDisplayMode): string | undefined {
  if (col.revisionKey) return col.revisionKey;
  if (mode === "accel" && col.accelKey) return col.accelKey;
  if (col.growthKey) return col.growthKey;
  return undefined;
}

export function revenueCellValue(
  metrics: ThemeRevenueMetricMapV0 | undefined,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
  revisions?: ThemeRevenueRevisionsV0,
): number | null | undefined {
  if (col.revisionKey) return revisions?.[col.revisionKey];
  if (!metrics) return null;
  if (mode === "accel" && col.accelKey) return metrics[col.accelKey];
  if (mode === "accel" && (col.growthOnly || col.hideInAccel)) return null;
  if (col.growthKey) return metrics[col.growthKey];
  return null;
}

export function formatRevenueCell(
  value: number | null | undefined,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
): string {
  if (col.revisionKey) {
    if (col.format === "bps") return formatRevenueBps(value);
    if (col.format === "count") return formatRevenueCount(value);
    return formatRevenuePct(value);
  }
  const fmt = mode === "accel" && col.accelKey ? "pp" : col.format;
  if (fmt === "pp") return formatRevenuePp(value);
  if (fmt === "ratio") return formatRevenueRatio(value);
  return formatRevenuePct(value);
}

export function revenueCellClass(value: number | null | undefined, col: RevenueColumnDef): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (col.format === "ratio" || col.format === "count") return undefined;
  if (value > 0) return "pos";
  if (value < 0) return "neg";
  return undefined;
}

export function revenueStatValue(
  stats: ThemeRevenueTableStatsBlockV0 | undefined,
  rowKey: RevenueStatRowKey,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
): number | null | undefined {
  const field = revenueColumnFieldKey(col, mode);
  if (!field || !stats?.[rowKey]) return null;
  const val = stats[rowKey][field];
  return val == null || !Number.isFinite(val) ? null : val;
}

export function buildAcceleratingNote(data: ThemeRevenueV0): string | null {
  const lyCyNy = data.accelerating?.ly_cy_ny ?? [];
  const cyNyN2y = data.accelerating?.cy_ny_n2y ?? [];
  if (!lyCyNy.length && !cyNyN2y.length) return null;
  const parts: string[] = [];
  if (lyCyNy.length) parts.push(`Accelerating LY→CY→NY: ${lyCyNy.join(", ")}`);
  if (cyNyN2y.length) parts.push(`Accelerating CY→NY→N2Y: ${cyNyN2y.join(", ")}`);
  return parts.join(" · ");
}

export function mergeRevenueConstituents(
  detailTickers: { ticker: string; name?: string; weight?: number | null }[],
  revenue: ThemeRevenueV0,
): Array<{
  ticker: string;
  name?: string;
  weight?: number | null;
  revenue: ThemeRevenueConstituentV0;
}> {
  const byTicker = new Map(revenue.constituents.map((c) => [c.ticker.toUpperCase(), c]));
  const order = detailTickers.map((c) => c.ticker.toUpperCase());
  const seen = new Set<string>();
  const rows: Array<{
    ticker: string;
    name?: string;
    weight?: number | null;
    revenue: ThemeRevenueConstituentV0;
  }> = [];

  for (const c of detailTickers) {
    const key = c.ticker.toUpperCase();
    const rev = byTicker.get(key);
    if (!rev) continue;
    seen.add(key);
    rows.push({ ticker: c.ticker, name: c.name, weight: c.weight ?? rev.weight, revenue: rev });
  }
  for (const rev of revenue.constituents) {
    const key = rev.ticker.toUpperCase();
    if (seen.has(key)) continue;
    rows.push({ ticker: rev.ticker, weight: rev.weight, revenue: rev });
  }
  rows.sort((a, b) => order.indexOf(a.ticker.toUpperCase()) - order.indexOf(b.ticker.toUpperCase()));
  return rows;
}

export function filterGrowthColumns(mode: RevenueDisplayMode): RevenueColumnDef[] {
  return REVENUE_GROWTH_COLUMNS.filter((col) => {
    if (mode === "accel" && (col.growthOnly || col.hideInAccel)) return false;
    return true;
  });
}
